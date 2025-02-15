"use server";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@vercel/postgres";
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { signOut } from 'next-auth/react';

async function getClient() {
  return await db.connect();
}

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce.number().gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  const client = await getClient();
 

  try {
    await client.sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    client.release();
  } catch (error) {
    client.release();
   
    // If a database error occurs, return a more specific error.
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {

  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });


if(!validatedFields.success){
  return{
    errors: validatedFields.error.flatten().fieldErrors,
    message: 'Missing Fields. Failed to Update Invoice.'
  }
}

const {customerId, amount, status} = validatedFields.data


  const amountInCents = amount * 100;
  

  const client = await getClient();
  try {
 
    
    await client.sql`
          UPDATE invoices
          SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
          WHERE id = ${id}
        `;
    client.release();
  } catch (error) {
    client.release();

    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string, formData: FormData) {
  const client = await getClient();

  try {
    await client.sql`DELETE FROM invoices WHERE id = ${id}`;
 
  } catch (error) {
    
    console.error("Database Error: Failed to Delete Invoice.");
    throw new Error("Failed to delete invoice.");
  } finally{
    client.release()
    revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  }
  

}



export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  formData.set('redirectTo', '/dashboard');
  try {
    await signIn('credentials', formData);
    redirect('/dashboard')
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}


