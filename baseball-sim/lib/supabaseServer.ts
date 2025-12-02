// import { supabase } from "@/lib/supabaseClient";

// const { data, error } = await supabase.auth.getUser();
// if (!data.user) throw new Error("로그인이 필요합니다.");

// const userId = data.user.id;

// const { data: coinData, error: coinError } = await supabase
//   .from("user_currency")
//   .select("coins")
//   .eq("user_id", userId)
//   .single();

// if (coinError) throw coinError;

// console.log("코인:", coinData.coins);
