"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

export default function ProfileRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectToUserProfile = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("user_number")
        .eq("id", user.id)
        .single();

      if (profile?.user_number) {
        router.replace(`/users/${profile.user_number}/profile`);
      } else {
        router.replace(`/users/${user.id}/profile`);
      }
    };

    redirectToUserProfile();
  }, [router]);

  return (
    <>
      <style>{`
        :root {
          --main-color: #4361EE;
        }
        .loader-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }
        .spinner {
          position: relative;
          margin: 0 auto;
          width: 70px;
        }
        .spinner:before {
          content: "";
          display: block;
          padding-top: 100%;
        }
        .circular {
          animation: rotate 2s linear infinite;
          height: 100%;
          transform-origin: center center;
          width: 100%;
          position: absolute;
          inset: 0;
          margin: auto;
        }
        .path {
          stroke: var(--main-color);
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
          animation: dash 1.5s ease-in-out infinite;
          stroke-linecap: round; 
        }
        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes dash {
          0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -35px;
          }
          100% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -124px;
          }
        }
      `}</style>
      <div className="loader-container">
        <div className="spinner">
          <svg className="circular" viewBox="25 25 50 50">
            <circle
              className="path"
              cx="50"
              cy="50"
              r="20"
              fill="none"
              strokeWidth="6" 
            />
          </svg>
        </div>
      </div>
    </>
  );
}
