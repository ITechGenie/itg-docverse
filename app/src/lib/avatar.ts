import CryptoJS from 'crypto-js';

/**
 * Generate Gravatar URL from email
 * @param email - User's email address
 * @param size - Image size (default: 80)
 * @param defaultImage - Default image type (default: 'identicon')
 * @returns Gravatar URL
 */
export function getGravatarUrl(
  email: string, 
  size: number = 80, 
  defaultImage: string = 'identicon'
): string {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = CryptoJS.MD5(trimmedEmail).toString();
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * Generate deterministic avatar URL based on username if no email
 * @param identifier - Username or email
 * @param size - Image size
 * @returns Avatar URL
 */
export function getAvatarUrl(identifier: string, size: number = 80): string {
  console.log('Generating avatar for:', identifier, 'Size:', size);
  if (identifier.includes('@')) {
    return getGravatarUrl(identifier, size);
  }
  
  // For usernames, create a hash and use it for consistent avatars
  const hash = CryptoJS.MD5(identifier.toLowerCase()).toString();
  return `https://www.gravatar.com/avatar/itg-${hash}?s=${size}&d=identicon`;
}

// `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, 
// `https://api.dicebear.com/7.x/avataaars/svg?seed=${tokenPayload.username || 'user'}`,
// `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiPost.author_id}`,
// `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiComment.author_id}`,
