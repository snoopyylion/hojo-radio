import Hero from "@/components/Hero";
import HomeNewsSection from "@/components/HomeNewsSection";
import KeyFeature from "@/components/KeyFeature";
import OurMission from "@/components/OurMission";

export default function Home() {
  return (
    <div className="bg-white dark:bg-black min-h-screen">
      <Hero />
      <HomeNewsSection />
      <KeyFeature />
      <OurMission />
    </div>
  );
}