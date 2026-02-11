import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Initialize Supabase client
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// ==================== AUTHENTICATION ====================

export const authService = {
  // Sign up new user
  async signUp(email, password, username) {
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign in
  async signIn(email, password) {
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign in with Google
  async signInWithGoogle() {
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        scopes:
          "email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send",
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    if (!supabase) throw new Error("Supabase not configured");

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  // Get session
  async getSession() {
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    if (!supabase) return () => {};

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  },
};

// ==================== DOCUMENTS ====================

export const documentService = {
  // Upload file to storage
  async uploadFile(file, userId) {
    if (!supabase) throw new Error("Supabase not configured");

    const filePath = `${userId}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from("user-uploads")
      .upload(filePath, file);

    if (error) throw error;

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        storage_path: filePath,
        status: "pending",
      })
      .select()
      .single();

    if (docError) throw docError;
    return doc;
  },

  // Get user's documents
  async getDocuments(userId) {
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Delete document
  async deleteDocument(documentId, storagePath) {
    if (!supabase) throw new Error("Supabase not configured");

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("user-uploads")
      .remove([storagePath]);

    if (storageError) console.error("Storage delete error:", storageError);

    // Mark as deleted in database
    const { error } = await supabase
      .from("documents")
      .update({ is_deleted: true })
      .eq("id", documentId);

    if (error) throw error;
  },

  // Process document (trigger backend processing)
  async processDocument(documentId) {
    // Call your FastAPI backend
    const response = await fetch(
      `/api/v1/vector/documents/${documentId}/process`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      },
    );

    if (!response.ok) throw new Error("Processing failed");
    return response.json();
  },
};

// ==================== VECTOR SEARCH ====================

export const searchService = {
  // Semantic search across documents
  async search(query, limit = 5, threshold = 0.7) {
    if (!supabase) throw new Error("Supabase not configured");

    const session = await supabase.auth.getSession();
    if (!session.data.session) throw new Error("Not authenticated");

    // Call your FastAPI backend
    const response = await fetch("/api/v1/vector/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify({ query, limit, threshold }),
    });

    if (!response.ok) throw new Error("Search failed");
    return response.json();
  },

  // Get document chunks
  async getDocumentChunks(documentId) {
    if (!supabase) throw new Error("Supabase not configured");

    const session = await supabase.auth.getSession();
    if (!session.data.session) throw new Error("Not authenticated");

    const response = await fetch(
      `/api/v1/vector/documents/${documentId}/chunks`,
      {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      },
    );

    if (!response.ok) throw new Error("Failed to fetch chunks");
    return response.json();
  },
};

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export const realtimeService = {
  // Subscribe to document changes
  subscribeToDocuments(userId, callback) {
    if (!supabase) return () => {};

    const channel = supabase
      .channel("documents-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();

    return () => channel.unsubscribe();
  },
};

export default {
  supabase,
  isSupabaseConfigured,
  authService,
  documentService,
  searchService,
  realtimeService,
};
