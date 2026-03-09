type PublicLongformVariant =
  | "blog"
  | "blog-post"
  | "course-detail"
  | "enroll";

type PublicLongformContentProps = {
  variant: PublicLongformVariant;
  title?: string;
};

const CONTENT_BY_VARIANT: Record<
  PublicLongformVariant,
  {
    badge: string;
    heading: string;
    subheading: string;
    paragraphs: string[];
    pointsTitle: string;
    points: string[];
  }
> = {
  blog: {
    badge: "Generated Content",
    heading: "How to use this blog for practical career growth",
    subheading: "Read With A Career-First Lens",
    paragraphs: [
      "This blog is built as a practical learning library, not only a news feed. Every article is meant to help you convert concepts into real skill. Start with foundational topics, move to implementation guides, and then read role-specific articles for interview preparation. This sequence reduces confusion and gives you a clear path from beginner knowledge to job-ready execution.",
      "For best outcomes, treat each article as an action plan. Summarize key ideas, create quick notes, and apply one concept in a small project within the same week. Repetition is important: revisit earlier guides after you complete newer topics. This strengthens retention and helps you connect tools, processes, and problem-solving methods across domains like cloud, devops, analytics, and application development.",
      "When using content for interview preparation, focus on explaining trade-offs and decisions rather than memorizing definitions. Employers value clarity, context, and practical examples. If you can describe why one approach is better in a specific situation, you show maturity and readiness for production environments. Use this blog as a revision system that keeps your learning aligned with real hiring expectations.",
    ],
    pointsTitle: "Action Checklist",
    points: [
      "Read in a fixed sequence: fundamentals -> implementation -> advanced optimization",
      "Convert each article into one practical task within 48 hours",
      "Maintain a revision log with mistakes, fixes, and final outcomes",
      "Use article insights to improve portfolio project quality and depth",
      "Practice concise explanations for interview and stakeholder communication",
    ],
  },
  "blog-post": {
    badge: "Generated Content",
    heading: "How to apply this article in real projects",
    subheading: "From Reading To Implementation",
    paragraphs: [
      "Use this article as a working reference. Read once for understanding, then read again with an implementation lens. Identify which parts can be applied immediately in your current workflow, project, or study plan. The fastest progress usually comes from small, repeated improvements instead of one-time heavy effort.",
      "Create a short execution checklist from the article and run it on a real task. Capture before-and-after results so you can measure impact. This helps you understand not only what works, but also where constraints appear in realistic conditions. Consistent measurement makes your learning sharper and easier to communicate in interviews.",
      "If you are preparing for career transitions, map article insights to role expectations. Convert each concept into one portfolio example, one interview explanation, and one troubleshooting scenario. This approach builds technical depth and practical confidence together.",
    ],
    pointsTitle: "Execution Pattern",
    points: [
      "Extract an implementation checklist and apply it immediately",
      "Measure impact with clear before-and-after comparisons",
      "Turn the concept into a portfolio-ready practical example",
      "Practice role-aligned explanations with trade-off reasoning",
      "Review and refine the process weekly for continuous improvement",
    ],
  },
  "course-detail": {
    badge: "Generated Content",
    heading: "How this program translates into job readiness",
    subheading: "Structured Learning To Hiring Readiness",
    paragraphs: [
      "A strong learning program should produce measurable output: real projects, clear documentation, and confident communication. This page outlines what you can expect from structured learning, guided practice, and milestone-based progression. When you follow a consistent practice routine, your skill depth improves and your execution speed becomes more reliable.",
      "To maximize value, align each module with one applied artifact. That can be a mini case study, architecture note, automation script, dashboard, or deployment record depending on your track. Artifacts prove capability. They also make your profile stronger because recruiters and interviewers can evaluate actual work quality, not just course completion.",
      "Career outcomes improve when learning includes revision, feedback loops, and communication drills. Build a simple weekly cycle: learn, implement, review, and present. This rhythm helps you retain concepts for longer and prepares you for technical discussions in interviews and team collaboration environments.",
    ],
    pointsTitle: "Progress Framework",
    points: [
      "Map every module to one practical, reviewable output",
      "Track progress with weekly quality and consistency metrics",
      "Use feedback cycles to reduce repeated mistakes quickly",
      "Maintain a portfolio that demonstrates production-level thinking",
      "Practice concise technical communication for interview rounds",
    ],
  },
  enroll: {
    badge: "Generated Content",
    heading: "What happens after enrollment",
    subheading: "First 30 Days Success Approach",
    paragraphs: [
      "Enrollment is the starting point of a structured growth plan. After registration, the focus should be on setting expectations, preparing a learning timeline, and defining measurable goals for each phase. Clear goals help you stay consistent and reduce drop-off during difficult topics.",
      "A high-performing learning journey depends on execution discipline. Attend sessions, complete practice tasks on schedule, and maintain revision notes. If a topic feels difficult, break it into smaller units and solve one practical problem at a time. This approach improves confidence and builds long-term retention.",
      "Career readiness also requires communication and interview preparation. Document your project decisions, maintain a concise summary of what you built, and practice role-specific explanations regularly. When combined with hands-on work, this creates a strong profile that stands out during hiring evaluations.",
    ],
    pointsTitle: "Consistency Rules",
    points: [
      "Set clear weekly outcomes immediately after enrollment",
      "Follow a repeatable cycle: learn, practice, review, present",
      "Document project decisions to strengthen interview storytelling",
      "Prioritize quality and consistency over short-term speed",
      "Use mentor feedback to accelerate weak-area improvement",
    ],
  },
};

const PublicLongformContent = ({ variant, title }: PublicLongformContentProps) => {
  const section = CONTENT_BY_VARIANT[variant];
  const heading = title || section.heading;

  return (
    <section className="py-10 md:py-14">
      <div className="container max-w-4xl">
        <div className="space-y-5 rounded-3xl border bg-card/80 p-5 shadow-sm sm:p-7 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{section.badge}</p>
          <h2 className="text-2xl font-heading font-black leading-tight text-foreground sm:text-3xl">{heading}</h2>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-primary sm:text-sm">{section.subheading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 30)} className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              {paragraph}
            </p>
          ))}
          <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{section.pointsTitle}</p>
            <ul className="mt-3 list-disc space-y-2.5 pl-6 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublicLongformContent;
