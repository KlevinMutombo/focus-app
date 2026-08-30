import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return Response.json({ error: 'Missing user ID' }, { status: 400 })
    }

    // Verify the request is actually coming from the logged-in user themselves
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user || user.id !== userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Now use the service role key to actually delete the user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}