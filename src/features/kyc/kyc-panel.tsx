"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  BadgeCheck,
  Clock,
  FileText,
  MessageSquareText,
  Paperclip,
  ShieldAlert,
  ShieldX,
  Upload,
  X,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextField } from "@/components/shared/form-fields"
import { StatusBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"
import { ApiError, isApiError } from "@/lib/api/errors"
import { uploadFile } from "@/lib/api/upload"
import { formatDate } from "@/lib/format"
import type { MeView } from "@/types/api"
import type { KycSubmissionView, RoleProfileView } from "@/types/domain"
import {
  KYC_ACCEPT,
  KYC_DOC_TYPES,
  KYC_MAX_BYTES,
  KYC_MAX_FILES,
  sha256Hex,
  type KycRole,
  type UploadedDocumentView,
} from "./types"

const slugOf = (role: KycRole) => (role === "TENANT" ? "tenant" : "owner")

export const kycKeys = {
  me: ["users", "me"] as const,
  submissions: ["kyc", "submissions", "me"] as const,
  profile: (role: KycRole) => ["profiles", slugOf(role)] as const,
}

type ViewState = "approved" | "pending" | "rejected" | "none"

/**
 * Identity verification for one role: current state, reviewer notes and the
 * submit flow (profile → upload 1–3 documents → hash → POST /kyc/submissions).
 * Used on /dashboard/profile (TENANT) and /owner/profile (OWNER).
 */
export function KycPanel({ role }: { role: "TENANT" | "OWNER" }) {
  const me = useQuery({ queryKey: kycKeys.me, queryFn: () => apiClient.get<MeView>("/users/me") })
  const submissions = useQuery({
    queryKey: kycKeys.submissions,
    queryFn: () => apiClient.get<KycSubmissionView[]>("/kyc/submissions/me"),
  })
  const profile = useQuery({
    queryKey: kycKeys.profile(role),
    queryFn: async () => {
      try {
        return await apiClient.get<RoleProfileView>(`/profiles/${slugOf(role)}`)
      } catch (e) {
        // 404 = no profile row yet; 403 = account without this role (GET is role-gated, PATCH is not).
        if (isApiError(e) && (e.status === 404 || e.status === 403)) return null
        throw e
      }
    },
  })

  if (me.isPending || submissions.isPending || profile.isPending) return <KycPanelSkeleton />
  if (me.isError || submissions.isError || profile.isError) {
    return (
      <PanelFrame>
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your verification status</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            Check your connection and try again.
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void me.refetch()
                void submissions.refetch()
                void profile.refetch()
              }}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </PanelFrame>
    )
  }

  const profileStatus = me.data.kycStatus?.[role === "TENANT" ? "tenant" : "owner"] ?? "NONE"
  const mine = submissions.data.filter((s) => s.role === role)
  const latest = mine[0]
  const state: ViewState =
    profileStatus === "APPROVED"
      ? "approved"
      : latest?.status === "PENDING"
        ? "pending"
        : profileStatus === "REJECTED" || latest?.status === "REJECTED"
          ? "rejected"
          : "none"

  const badge: Record<ViewState, { status: string; label: string }> = {
    approved: { status: "APPROVED", label: "Verified" },
    pending: { status: "PENDING", label: "Under review" },
    rejected: { status: "REJECTED", label: "Not approved" },
    none: { status: "NONE", label: "Not verified" },
  }

  const earlier = state === "none" ? mine : mine.slice(1)

  return (
    <PanelFrame aside={<StatusBadge status={badge[state].status} label={badge[state].label} />}>
      {state === "approved" && (
        <StateLine icon={BadgeCheck} tone="success">
          Your identity is verified
          {latest?.status === "APPROVED" && latest.decidedAt ? ` since ${formatDate(latest.decidedAt)}` : ""}.
          {latest?.status === "APPROVED" && latest.expiresAt
            ? ` It stays valid until ${formatDate(latest.expiresAt)}.`
            : ""}{" "}
          {role === "TENANT" ? "You can apply for any listed room." : "You can publish properties and rooms."}
        </StateLine>
      )}

      {state === "pending" && latest && (
        <div className="flex flex-col gap-4">
          <StateLine icon={Clock} tone="info">
            Submitted {formatDate(latest.createdAt)} with {latest.documentObjectKeys.length}{" "}
            {latest.documentObjectKeys.length === 1 ? "document" : "documents"}. An admin will approve or
            reject it; you&apos;ll see the result here.
          </StateLine>
          {latest.reviewNotes && (
            <ReviewerNote title="The reviewer asked for more information" notes={latest.reviewNotes}>
              A submission can&apos;t be changed while it&apos;s under review. The reviewer will decide with
              what&apos;s there, or reject it so you can send new documents.
            </ReviewerNote>
          )}
        </div>
      )}

      {state === "rejected" && (
        <div className="flex flex-col gap-4">
          <StateLine icon={ShieldX} tone="danger">
            Your last submission wasn&apos;t approved
            {latest?.decidedAt ? ` (${formatDate(latest.decidedAt)})` : ""}. Check the note below and send
            clearer or different documents.
          </StateLine>
          {latest?.reviewNotes && <ReviewerNote title="Note from the reviewer" notes={latest.reviewNotes} />}
        </div>
      )}

      {state === "none" && (
        <StateLine icon={ShieldAlert} tone="warning">
          {role === "TENANT"
            ? "Owners only accept applications from verified tenants."
            : "Properties can only be published by verified owners."}{" "}
          Upload a clear photo or scan of an official ID. An admin checks it, usually within a day.
        </StateLine>
      )}

      {(state === "none" || state === "rejected") && (
        <KycSubmitForm
          key={latest?.id ?? "first"}
          role={role}
          profileMissing={profile.data === null}
          defaultName={me.data.email.split("@")[0] ?? ""}
          resubmit={state === "rejected"}
        />
      )}

      {earlier.length > 0 && (
        <details className="group rounded-lg border px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium marker:text-subtle">
            Earlier submissions ({earlier.length})
          </summary>
          <ul className="mt-3 flex flex-col divide-y">
            {earlier.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-muted-foreground">
                  {formatDate(s.createdAt)} · {s.documentObjectKeys.length}{" "}
                  {s.documentObjectKeys.length === 1 ? "document" : "documents"}
                </span>
                <StatusBadge status={s.status} />
                {s.reviewNotes && <p className="w-full text-muted-foreground">“{s.reviewNotes}”</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </PanelFrame>
  )
}

function PanelFrame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <section
      aria-labelledby="kyc-heading"
      className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="kyc-heading" className="text-lg font-semibold">
            Identity verification
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Required before you can rent or list.</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

const TONE_CLASS = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-destructive",
} as const

function StateLine({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Clock
  tone: keyof typeof TONE_CLASS
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`mt-0.5 size-5 shrink-0 ${TONE_CLASS[tone]}`} aria-hidden />
      <p className="max-w-prose text-[0.9375rem] leading-relaxed">{children}</p>
    </div>
  )
}

function ReviewerNote({ title, notes, children }: { title: string; notes: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <MessageSquareText className="size-4 text-subtle" aria-hidden /> {title}
      </p>
      <blockquote className="mt-2 border-l-2 border-input pl-3 text-[0.9375rem] whitespace-pre-line">
        {notes}
      </blockquote>
      {children && <p className="mt-3 text-sm text-muted-foreground">{children}</p>}
    </div>
  )
}

export function KycPanelSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-6" aria-busy aria-label="Loading">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------ */

interface PickedFile {
  key: string
  file: File
  preview: string | null
}

function makeSchema(requireName: boolean) {
  return z.object({
    displayName: requireName
      ? z.string().trim().min(2, "Use at least 2 characters").max(80, "Use at most 80 characters")
      : z.string().optional(),
    docType: z.string().min(1, "Choose the type of document"),
    files: z
      .array(z.custom<PickedFile>())
      .min(1, "Add at least one document")
      .max(KYC_MAX_FILES, `Add at most ${KYC_MAX_FILES} files`)
      .refine((fs) => fs.every((f) => f.file.size <= KYC_MAX_BYTES), "Each file must be 15 MB or smaller")
      .refine(
        (fs) => fs.every((f) => (KYC_ACCEPT as readonly string[]).includes(f.file.type)),
        "Use JPG, PNG, WebP or PDF files"
      ),
  })
}
type Values = z.infer<ReturnType<typeof makeSchema>>

type Phase = { step: "profile" } | { step: "upload"; index: number; percent: number } | { step: "submit" }

function KycSubmitForm({
  role,
  profileMissing,
  defaultName,
  resubmit,
}: {
  role: KycRole
  profileMissing: boolean
  defaultName: string
  resubmit: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeSchema(profileMissing), [profileMissing])
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: defaultName.length >= 2 ? defaultName : "", docType: "", files: [] },
  })
  const [phase, setPhase] = useState<Phase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Documents already stored for this attempt, so a retry after a failed submit doesn't re-upload.
  const uploaded = useRef(new Map<string, string>())
  const [storedKeys, setStoredKeys] = useState<string[]>([])

  const files = useWatch({ control: form.control, name: "files" })
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(
    () => () => {
      for (const f of filesRef.current) if (f.preview) URL.revokeObjectURL(f.preview)
    },
    []
  )

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const added: PickedFile[] = Array.from(list).map((file) => ({
      key: `${file.name}:${file.size}:${file.lastModified}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }))
    const next = [...files, ...added.filter((a) => !files.some((f) => f.key === a.key))]
    form.setValue("files", next, { shouldValidate: true })
    setError(null)
  }

  const removeFile = (key: string) => {
    const f = files.find((x) => x.key === key)
    if (f?.preview) URL.revokeObjectURL(f.preview)
    form.setValue(
      "files",
      files.filter((x) => x.key !== key),
      { shouldValidate: true }
    )
  }

  const submit = useMutation({
    meta: { silent: true },
    mutationFn: async (v: Values) => {
      setError(null)
      if (profileMissing) {
        setPhase({ step: "profile" })
        await apiClient.patch<RoleProfileView>(`/profiles/${slugOf(role)}`, {
          displayName: v.displayName?.trim(),
        })
      }

      const docLabel = KYC_DOC_TYPES[role].find((d) => d.value === v.docType)?.label ?? "Identity document"
      const ids: string[] = []
      for (const [index, picked] of v.files.entries()) {
        const done = uploaded.current.get(picked.key)
        if (done) {
          ids.push(done)
          continue
        }
        setPhase({ step: "upload", index, percent: 0 })
        try {
          const doc = await uploadFile<UploadedDocumentView>("/documents", picked.file, {
            fields: {
              label: v.files.length > 1 ? `${docLabel} (${index + 1} of ${v.files.length})` : docLabel,
              objectKeyPrefix: `kyc/${slugOf(role)}`,
            },
            onProgress: (percent) => setPhase({ step: "upload", index, percent }),
          })
          uploaded.current.set(picked.key, doc.id)
          setStoredKeys((k) => [...k, picked.key])
          ids.push(doc.id)
        } catch (e) {
          throw new UploadFailure(e)
        }
      }

      setPhase({ step: "submit" })
      const docHash = await sha256Hex(v.files[0].file)
      return apiClient.post<KycSubmissionView>("/kyc/submissions", {
        role,
        documentObjectKeys: ids,
        docHash,
      })
    },
    onSuccess: () => {
      setPhase(null)
      toast.success("Documents submitted", {
        description: "An admin will review them. You'll see the decision on this page.",
      })
      void queryClient.invalidateQueries({ queryKey: kycKeys.submissions })
      void queryClient.invalidateQueries({ queryKey: kycKeys.profile(role) })
      router.refresh()
    },
    onError: (e) => {
      setPhase(null)
      setError(messageFor(e))
      if (e instanceof UploadFailure) return
      if (isApiError(e) && e.status === 409) {
        void queryClient.invalidateQueries({ queryKey: kycKeys.submissions })
      }
      if (isApiError(e)) {
        const fields = e.fieldErrors()
        if (fields.displayName) form.setError("displayName", { message: fields.displayName })
      }
    },
  })

  const busy = submit.isPending
  const filesError = form.formState.errors.files

  return (
    <form
      onSubmit={form.handleSubmit((v) => submit.mutate(v))}
      noValidate
      className="flex flex-col gap-5 border-t pt-5"
      aria-busy={busy || undefined}
    >
      <h3 className="font-medium">{resubmit ? "Send new documents" : "Submit your documents"}</h3>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {profileMissing && (
          <TextField
            control={form.control}
            name="displayName"
            label="Name shown on your profile"
            description="Owners and admins see this name."
            autoComplete="name"
            disabled={busy}
          />
        )}
        <Controller
          control={form.control}
          name="docType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="kyc-doc-type">Document type</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                <SelectTrigger
                  id="kyc-doc-type"
                  className="w-full"
                  aria-invalid={fieldState.invalid || undefined}
                >
                  <SelectValue placeholder="Choose a document" />
                </SelectTrigger>
                <SelectContent>
                  {KYC_DOC_TYPES[role].map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" id="kyc-files-label">
            Files{" "}
            <span className="font-normal text-muted-foreground">· up to 3, front and back if needed</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={KYC_ACCEPT.join(",")}
            multiple
            className="sr-only"
            aria-labelledby="kyc-files-label"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-3">
            {files.map((f, i) => {
              const uploading = phase?.step === "upload" && phase.index === i
              const stored = storedKeys.includes(f.key)
              return (
                <li key={f.key} className="flex flex-col overflow-hidden rounded-lg border bg-background">
                  <div className="relative aspect-4/3 bg-surface-2">
                    {f.preview ? (
                      <Image
                        src={f.preview}
                        alt={`Preview of ${f.file.name}`}
                        fill
                        unoptimized
                        sizes="(min-width: 640px) 33vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-subtle">
                        <FileText className="size-8" aria-hidden />
                      </div>
                    )}
                    {!busy && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        aria-label={`Remove ${f.file.name}`}
                        onClick={() => removeFile(f.key)}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 p-3">
                    <p className="truncate text-sm font-medium" title={f.file.name}>
                      {f.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {f.file.size < 1024 * 1024
                        ? `${Math.max(1, Math.round(f.file.size / 1024))} KB`
                        : `${(f.file.size / 1024 / 1024).toFixed(1)} MB`}
                      {stored ? " · uploaded" : ""}
                    </p>
                    {uploading && (
                      <Progress
                        value={phase.percent}
                        aria-label={`Uploading ${f.file.name}`}
                        className="h-1.5"
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {files.length < KYC_MAX_FILES && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-background px-4 py-5 text-center text-sm transition-colors hover:border-input hover:bg-surface-2/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50"
          >
            {files.length === 0 ? (
              <Upload className="size-5 text-subtle" aria-hidden />
            ) : (
              <Paperclip className="size-5 text-subtle" aria-hidden />
            )}
            <span className="font-medium">{files.length === 0 ? "Choose files" : "Add another file"}</span>
            <span className="text-xs text-muted-foreground">JPG, PNG, WebP or PDF · max 15 MB each</span>
          </button>
        )}
        {filesError && (
          <p role="alert" className="text-sm text-destructive">
            {filesError.message ?? filesError.root?.message}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {phase?.step === "profile" && "Setting up your profile…"}
          {phase?.step === "upload" && `Uploading file ${phase.index + 1} of ${files.length}…`}
          {phase?.step === "submit" && "Sending for review…"}
        </p>
        <Button type="submit" loading={busy}>
          {resubmit ? "Resubmit for review" : "Submit for review"}
        </Button>
      </div>
    </form>
  )
}

class UploadFailure extends Error {
  readonly cause: unknown
  constructor(cause: unknown) {
    super("upload failed")
    this.cause = cause
  }
}

function messageFor(e: unknown): string {
  if (e instanceof UploadFailure) {
    const c = e.cause
    if (!(c instanceof ApiError)) return "The upload didn't finish. Check your connection and try again."
    if (c.status === 0) return c.message
    if (c.status >= 500)
      return "Document storage is unavailable right now, so your files couldn't be uploaded. Nothing was submitted. Please try again later."
    if (c.status === 413) return "One of the files is larger than 15 MB. Choose a smaller file."
    if (c.status === 403)
      return "Your account can't upload documents yet. Sign in with a tenant or owner account."
    return c.userMessage
  }
  if (isApiError(e)) {
    if (e.status === 409)
      return "You already have a verification under review or approved for this role, so a new one can't be sent."
    if (e.status === 404) return "Your profile isn't set up yet. Refresh the page and try again."
    return e.userMessage
  }
  return "Something went wrong. Please try again."
}
