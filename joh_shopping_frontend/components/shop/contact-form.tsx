"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { sendContactMessage } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { fmt, TZ_PHONE_REGEX } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

export function ContactForm() {
  const { t } = useT();
  const c = t.shop.contact;
  const v = t.common.validation;
  const [sent, setSent] = useState(false);
  const schema = z.object({
    name: z.string().trim().min(2, v.required),
    email: z.string().email(v.email),
    phone: z.string().optional().refine((s) => !s || TZ_PHONE_REGEX.test(s.replace(/\s/g, "")), v.phone),
    subject: z.string().min(1, v.required),
    message: z.string().trim().min(10, fmt(v.min, { n: 10 })),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "order" },
  });

  const onSubmit = async (values: Values) => {
    try {
      await sendContactMessage({ ...values, subject: c.subjects[values.subject as keyof typeof c.subjects] ?? values.subject });
      reset();
      setSent(true);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="size-14 text-success" />
        <p className="mt-4 max-w-sm text-lg font-medium">{c.sent}</p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          {c.formTitle}
        </Button>
      </div>
    );
  }

  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label={c.name} htmlFor="c-name" error={e.name?.message}>
        <Input id="c-name" autoComplete="name" {...register("name")} aria-invalid={!!e.name} />
      </Field>
      <Field label={c.email} htmlFor="c-email" error={e.email?.message}>
        <Input id="c-email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!e.email} />
      </Field>
      <Field label={c.phone} htmlFor="c-phone" error={e.phone?.message} optional={t.common.misc.optional}>
        <Input id="c-phone" type="tel" placeholder="0712 345 678" {...register("phone")} aria-invalid={!!e.phone} />
      </Field>
      <Field label={c.subject} htmlFor="c-subject" error={e.subject?.message}>
        <NativeSelect id="c-subject" {...register("subject")}>
          {Object.entries(c.subjects).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={c.message} htmlFor="c-message" error={e.message?.message} className="sm:col-span-2">
        <Textarea id="c-message" placeholder={c.messagePlaceholder} className="min-h-36" {...register("message")} aria-invalid={!!e.message} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          {c.send}
        </Button>
      </div>
    </form>
  );
}
