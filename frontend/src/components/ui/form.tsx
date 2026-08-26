"use client"

import * as React from "react"
import type { Label as LabelPrimitive } from "radix-ui"
import { Slot } from "radix-ui"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { flattenFormErrors } from "@/lib/validation/form-errors"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
  required: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(undefined)

type FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = ControllerProps<TFieldValues, TName> & {
  required?: boolean
}

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ required = false, ...props }: FormFieldProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name, required }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function requireContext<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message)
  return value
}

const useFormField = () => {
  const fieldContext = requireContext(
    React.useContext(FormFieldContext),
    "useFormField should be used within <FormField>",
  )
  const itemContext = requireContext(
    React.useContext(FormItemContext),
    "useFormField should be used within <FormItem>",
  )
  const formContext = requireContext(
    useFormContext() as UseFormReturn | null,
    "useFormField should be used within <Form>",
  )
  const { getFieldState } = formContext
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    required: fieldContext.required,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | undefined>(undefined)

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId, required } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive-emphasis", className)}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-1 text-destructive-emphasis">*</span>
          <span className="sr-only">(필수)</span>
        </>
      ) : null}
    </Label>
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId, name, required } = useFormField()

  return (
    <Slot.Root
      data-slot="form-control"
      data-form-field-name={name}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      aria-required={required || undefined}
      aria-errormessage={error ? formMessageId : undefined}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message || "") : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive-emphasis text-sm", className)}
      {...props}
    >
      {body}
    </p>
  )
}

type ErrorSummaryErrors = FieldErrors<FieldValues> | Record<string, unknown>

export interface FormErrorSummaryProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** RHF 외의 raw form도 같은 summary를 사용할 수 있다. 생략하면 가장 가까운 FormProvider를 구독한다. */
  errors?: ErrorSummaryErrors
  labels?: Record<string, string>
  onNavigate?: (fieldName: string) => unknown
  title?: string
}

function FormErrorSummaryView({
  errors,
  labels = {},
  onNavigate,
  title = "입력 내용을 확인해 주세요.",
  className,
  ...props
}: FormErrorSummaryProps & { errors: ErrorSummaryErrors }) {
  const titleId = React.useId()
  const entries = flattenFormErrors(errors)
  if (entries.length === 0) return null

  return (
    <div
      {...props}
      data-slot="form-error-summary"
      data-form-error-summary="true"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground",
        className,
      )}
    >
      <p id={titleId} className="font-bold">
        입력 오류 {entries.length}개 — {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {entries.map((entry) => {
          const label = labels[entry.name] ?? entry.name
          const message = entry.message ?? "입력값을 확인해 주세요."
          const isRootError = entry.name === "root" || entry.name.startsWith("root.")
          return (
            <li key={entry.name}>
              {isRootError || !onNavigate ? (
                <span><span className="font-semibold">{label}</span>: {message}</span>
              ) : (
                <button
                  type="button"
                  className="text-left underline decoration-current/40 underline-offset-2 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void onNavigate(entry.name)}
                >
                  <span className="font-semibold">{label}</span>: {message}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ConnectedFormErrorSummary(props: Omit<FormErrorSummaryProps, "errors">) {
  const form = requireContext(
    useFormContext() as UseFormReturn | null,
    "FormErrorSummary should be used within <Form> or receive errors",
  )
  const { errors } = useFormState({ control: form.control })
  return <FormErrorSummaryView {...props} errors={errors} />
}

function FormErrorSummary({ errors, ...props }: FormErrorSummaryProps) {
  return errors === undefined
    ? <ConnectedFormErrorSummary {...props} />
    : <FormErrorSummaryView {...props} errors={errors} />
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormErrorSummary,
}
