'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?message=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/login') // Middleware detects the session and routes to the correct dashboard
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const phone = formData.get('phone') as string
    const formattedPhone = phone ? `+216${phone}` : null

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'parent',
                phone_number: formattedPhone
            }
        }
    })

    if (authError) {
        // If the user already exists in auth but has no profile for some reason, or just a general error.
        if (authError.message.includes('User already registered') || authError.status === 400) {
            redirect('/login?message=' + encodeURIComponent("Cet e-mail est déjà utilisé. Veuillez vous connecter."))
        }
        redirect('/login?message=' + encodeURIComponent("Erreur d'inscription : " + authError.message))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard/parent')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
