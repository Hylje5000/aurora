"use client";

import dynamic from "next/dynamic";

const MapLoader = dynamic(() => import("./MapWithNav"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900" />,
});

export default MapLoader;
