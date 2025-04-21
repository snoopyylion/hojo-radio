import { auth } from "@clerk/nextjs/server"; 
import { supabaseAdmin } from "@/lib/supabase/admin"; 
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { commentId, reactionType } = await req.json();
    
    // Ensure valid reaction type
    if (!['like', 'dislike'].includes(reactionType)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }
    
    // Check if the user has already reacted - don't use .single() here
    const { data: existingReactions, error: checkError } = await supabaseAdmin
      .from("comment_reactions")
      .select("*")
      .eq("user_id", userId)
      .eq("comment_id", commentId);
    
    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // Process the reaction based on what already exists
    if (existingReactions && existingReactions.length > 0) {
      const existingReaction = existingReactions[0];
      
      // If the same reaction type, delete it (toggle off)
      if (existingReaction.reaction_type === reactionType) {
        const { error: deleteError } = await supabaseAdmin
          .from("comment_reactions")
          .delete()
          .eq("id", existingReaction.id);
          
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
        
        return NextResponse.json({ message: "Reaction removed" });
      } 
      // If different reaction type, update it
      else {
        const { data, error } = await supabaseAdmin
          .from("comment_reactions")
          .update({ reaction_type: reactionType })
          .eq("id", existingReaction.id);
          
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json({ message: "Reaction updated", data });
      }
    } 
    // If no existing reaction, create a new one
    else {
      const { data, error } = await supabaseAdmin
        .from("comment_reactions")
        .insert([{ 
          user_id: userId, 
          comment_id: commentId, 
          reaction_type: reactionType 
        }]);
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ message: "Reaction added", data });
    }
  } catch (err) {
    console.error("Error processing reaction:", err);
    return NextResponse.json({ error: "Failed to process reaction" }, { status: 500 });
  }
}