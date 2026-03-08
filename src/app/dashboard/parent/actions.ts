'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

export async function addStudent(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Vous devez être connecté pour ajouter un élève.' }
    }

    const name = formData.get('name') as string
    const gradeLevel = formData.get('grade_level') as string

    if (!name || !gradeLevel) {
        return { error: 'Le nom et le niveau scolaire sont obligatoires.' }
    }

    // Generate a unique QR code hash for the student
    const qrCodeHash = crypto.randomUUID()

    const { error } = await supabase.from('students').insert({
        parent_id: user.id,
        name,
        grade_level: gradeLevel,
        qr_code_hash: qrCodeHash,
    })

    if (error) {
        console.error('Add student error:', error)
        return { error: "Impossible d'ajouter l'élève. Veuillez réessayer." }
    }

    revalidatePath('/dashboard/parent')
    return { success: true }
}
