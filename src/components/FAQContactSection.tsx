import { motion } from "framer-motion";
import FAQSection from "./FAQSection";
import ContactSection from "./ContactSection";

const FAQContactSection = () => {
  return (
    <section id="faq" className="py-16 md:py-24 section-alt">
      <div className="container">
        <motion.div
          className="grid md:grid-cols-2 gap-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <FAQSection compact />
          <ContactSection compact sourcePage="homepage" />
        </motion.div>
      </div>
    </section>
  );
};

export default FAQContactSection;
