//import React, { useState, useEffect } from 'react';

import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { useAuth } from "@/contexts/auth-context";

export default function NotifyBell() {
  const { user } = useAuth();
  const count = user?.mentionsCount ?? 0;
  const showBadge = count > 0;

  return (
    <div className="relative inline-block">
      <Button variant="outline" size="icon" asChild>
        <Link to="/notifications" aria-label="View notifications">
          <Bell className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all" />
        </Link>
      </Button>
      {showBadge && (
        <span
          className="absolute -top-1 -right-1 min-w-[1rem] h-[1rem] px-1 rounded-full bg-red-600 text-white text-[0.65rem] leading-[1rem] text-center"
          aria-label={`${count} new mentions`}
        >
          {count}
        </span>
      )}
    </div>
  );
}


