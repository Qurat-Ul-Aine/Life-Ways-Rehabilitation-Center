import { useEffect } from "react";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Features from "@/components/Features";
import Contact from "@/components/Contact";
import MedicalOrganizationJsonLd from "@/components/MedicalOrganizationJsonLd";

const Index = () => {
  useEffect(() => {
    if (window.location.hash === "#contact") {
      window.setTimeout(() => {
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, []);

  return (
    <div className="flex w-full flex-col">
      <MedicalOrganizationJsonLd />
      <Hero />
      <Services />
      <About />
      <Features />
      <Contact />
    </div>
  );
};

export default Index;