"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { saveProfile } from "@/lib/data/profile";
import { logEvent } from "@/lib/events-server";

/** G08: the user confirms their roommates agreed to fridge photos being analyzed. */
export async function giveConsent(formData: FormData) {
  const user = await requireUser();
  const next = formData.get("next") === "photo" ? "photo" : "video";
  await saveProfile(user.id, { fridgeConsentAt: new Date() });
  await logEvent(user.id, "consent", "G08", { answer: "agreed", next });
  redirect(`/add/scan?mode=${next}`);
}

export async function chooseReceipt() {
  const user = await requireUser();
  await logEvent(user.id, "consent", "G08", { answer: "receipt_instead" });
  redirect("/add/scan?mode=receipt");
}
