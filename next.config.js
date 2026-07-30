/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // antd болон FullCalendar-ийг transpile хийнэ (ESM пакетууд).
  transpilePackages: [
    "antd",
    "@ant-design/icons",
    "@ant-design/nextjs-registry",
    "@fullcalendar/core",
    "@fullcalendar/react",
    "@fullcalendar/resource",
    "@fullcalendar/resource-timeline",
    "@fullcalendar/interaction",
  ],
};

module.exports = nextConfig;
