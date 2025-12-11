//import React, { useState, useEffect } from 'react';

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" />
            Notifications
          </h1>
          
        </div>
      </div>
      <div className="text-center text-muted-foreground">
        <p>No new notifications.</p>
      </div>
    </div>
  );
}
