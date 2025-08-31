export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  category?: string;
  guid?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
}

class RSSService {
  private async fetchRSSFeed(url: string): Promise<string> {
    try {
      // Use a CORS proxy to avoid CORS issues
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.contents;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      throw error;
    }
  }

  private parseRSSXML(xmlString: string): RSSFeed {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Failed to parse RSS XML');
    }

    const channel = xmlDoc.querySelector('channel');
    if (!channel) {
      throw new Error('No channel found in RSS feed');
    }

    const title = channel.querySelector('title')?.textContent || '';
    const description = channel.querySelector('description')?.textContent || '';
    const link = channel.querySelector('link')?.textContent || '';

    const items: RSSItem[] = [];
    const itemElements = xmlDoc.querySelectorAll('item');

    itemElements.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const author = item.querySelector('author')?.textContent ||
        item.querySelector('dc\\:creator')?.textContent ||
        item.querySelector('creator')?.textContent || undefined;
      const category = item.querySelector('category')?.textContent || undefined;
      const guid = item.querySelector('guid')?.textContent || undefined;

      items.push({
        title,
        link,
        description,
        pubDate,
        author,
        category,
        guid
      });
    });

    return {
      title,
      description,
      link,
      items
    };
  }

  async getWiredAIFeed(limit: number = 5): Promise<RSSFeed> {
    try {
      const url = 'https://www.wired.com/feed/tag/ai/latest/rss';
      const xmlString = await this.fetchRSSFeed(url);
      const feed = this.parseRSSXML(xmlString);

      // Limit the number of items
      feed.items = feed.items.slice(0, limit);

      return feed;
    } catch (error) {
      console.error('Error fetching Wired AI feed:', error);
      throw error;
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      }
    } catch (error) {
      return 'Unknown time';
    }
  }

  stripHTML(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}

export const rssService = new RSSService(); 