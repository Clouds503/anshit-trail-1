import DynamicPage from "@/components/DynamicPage";
import SocialLinks from "@/components/SocialLinks";

const AboutUs = () => (
  <DynamicPage
    slug="about"
    beforeFooter={<SocialLinks placement="about" variant="floating3d" className="container py-10 md:py-14 justify-center" />}
  />
);

export default AboutUs;
