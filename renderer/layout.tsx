import React from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"],preload: true });

const Layout = ({ children }) => {
  return (
    <>
      <main className={inter.className}>{children}</main>
    </>
  );
};

export default Layout;