import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type FaqItem = {
  q: string;
  a: string;
  subAnswers: string[];
};

const fallbackFaqs: FaqItem[] = [
  {
    q: "What are the admission requirements?",
    a: "No prior coding experience is required for most programs. You just need a graduation degree (any stream) and a passion for technology.",
    subAnswers: [],
  },
  {
    q: "Do you offer EMI or installment options?",
    a: "Yes! We offer flexible EMI options with 0% interest through our banking partners. You can also pay in 2-3 installments directly.",
    subAnswers: [],
  },
  {
    q: "What is your placement success rate?",
    a: "We have a 95%+ placement rate with an average package of INR 6-12 LPA. Our placement cell partners with 500+ companies.",
    subAnswers: [],
  },
  {
    q: "Are classes online or offline?",
    a: "Both! We offer live instructor-led online and offline classroom modes. All sessions are recorded with lifetime access.",
    subAnswers: [],
  },
  {
    q: "Do I get a certificate?",
    a: "Yes, you receive an industry-recognized certificate along with preparation support for global certifications like AWS, Azure, and Google Cloud.",
    subAnswers: [],
  },
  {
    q: "What if I miss a class?",
    a: "All live sessions are recorded and uploaded within 24 hours. You also get lifetime access to course materials.",
    subAnswers: [],
  },
  {
    q: "Is there a refund policy?",
    a: "We offer a 7-day money-back guarantee. If you're not satisfied within the first week, we'll process a full refund.",
    subAnswers: [],
  },
];

interface FAQSectionProps {
  compact?: boolean;
}

const FAQSection = ({ compact }: FAQSectionProps) => {
  const { data: dbFaqs } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const { data } = await supabase.from("faqs").select("*").eq("is_active", true).order("sort_order");
      return data && data.length > 0
        ? data.map((f: any) => ({
            q: f.question,
            a: f.answer,
            subAnswers: Array.isArray(f.sub_answers) ? f.sub_answers.filter(Boolean) : [],
          }))
        : null;
    },
  });

  const faqs: FaqItem[] = dbFaqs || fallbackFaqs;

  const renderAnswer = (faq: FaqItem, i: number) => (
    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
      <p>{faq.a}</p>
      {faq.subAnswers.length ? (
        <ul className="mt-2 list-disc pl-5 space-y-1">
          {faq.subAnswers.map((ans, idx) => (
            <li key={`${i}-${idx}`}>{ans}</li>
          ))}
        </ul>
      ) : null}
    </AccordionContent>
  );

  if (compact) {
    return (
      <div>
        <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">FAQ</p>
        <h2 className="text-xl md:text-3xl font-heading font-extrabold text-foreground mb-4 md:mb-6">Common Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.slice(0, 6).map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-background rounded-lg border px-3 md:px-5">
              <AccordionTrigger className="text-left font-heading font-bold text-foreground text-xs md:text-sm hover:text-primary transition-colors py-2.5 md:py-3 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              {renderAnswer(faq, i)}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  return (
    <section id="faq" className="py-16 md:py-24 section-alt">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Common Questions</h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-background rounded-lg border px-5">
              <AccordionTrigger className="text-left font-heading font-bold text-foreground text-sm hover:text-primary transition-colors py-4 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              {renderAnswer(faq, i)}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
