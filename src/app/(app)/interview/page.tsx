import type { Metadata } from "next";
import { BriefcaseBusiness } from "lucide-react";
import { PlannedPage } from "@/components/planned/planned-page";

export const metadata: Metadata = {
  title: "Interview Preparation",
};

export default function InterviewPage() {
  return (
    <PlannedPage
      eyebrow="Career"
      title="Interview Preparation"
      icon={BriefcaseBusiness}
      phase={5}
      summary="Build honest application materials, practise role-specific interviews, and compare job descriptions against demonstrated skills."
      features={[
        "Resume builder, LinkedIn checklist, and GitHub portfolio review guidance.",
        "Python, SQL, statistics, machine learning, behavioural, and role-specific mock interviews.",
        "Job-description analysis that extracts required and preferred skills, compares them with evidence, and ranks gaps.",
        "A preparation plan and portfolio project suggestion for each application.",
        "An internship tracker for company, role, date, link, status, next action, and notes.",
        "Clear separation between real openings you enter and example opportunities, with no invented qualifications or achievements.",
      ]}
    />
  );
}
