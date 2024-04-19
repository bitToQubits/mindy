import React from "react";
import Script from 'next/script';
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const Layout = ({ children }) => {
  return (
    <>
      <main className={inter.className}>{children}</main>
      <Script
            src="https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OpusMediaRecorder.umd.js"
          />
      <Script
        src="https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/encoderWorker.umd.js"
      />
    </>
  );
};

export default Layout;