// // src/app/actions/user.ts
// "use server";

// import { createClient } from "@supabase/supabase-js";

// export async function getUserCoin(access_token: string) {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     { global: { headers: { Authorization: `Bearer ${access_token}` } } }
//   );

//   const { data, error } = await supabase.auth.getUser();
//   if (!data.user) throw new Error("로그인이 필요합니다.");

//   const userId = data.user.id;

//   const { data: coinData, error: coinError } = await supabase
//     .from("user_currency")
//     .select("coins")
//     .eq("user_id", userId)
//     .single();

//   if (coinError) throw coinError;

//   return coinData.coins;
// }

// export async function spendCoins(amount: number, access_token: string) {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     { global: { headers: { Authorization: `Bearer ${access_token}` } } }
//   );

//   const { data, error } = await supabase.rpc("spend_coins", {
//     user_uuid: (await supabase.auth.getUser()).data.user!.id,
//     amount,
//   });

//   if (error) throw error;
//   return true;
// }

// export async function attemptScout(access_token: string) {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     { global: { headers: { Authorization: `Bearer ${access_token}` } } }
//   );

//   const { data, error } = await supabase.auth.getUser();
//   if (!data.user) return { success: false, message: "로그인이 필요합니다." };

//   const coins = await getUserCoin(access_token);
//   if (coins < 10) return { success: false, message: "코인이 부족합니다." };

//   await spendCoins(10, access_token);

//   const { data: newPlayerId, error: scoutError } = await supabase.rpc(
//     "scout_player",
//     { user_uuid: data.user.id }
//   );

//   if (scoutError) return { success: false, message: "스카우트 실패" };

//   return { success: true, playerId: newPlayerId };
// }

// export async function getUserPlayers(access_token: string) {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     { global: { headers: { Authorization: `Bearer ${access_token}` } } }
//   );

//   const { data, error } = await supabase.auth.getUser();
//   if (!data.user) throw new Error("로그인이 필요합니다.");

//   const userId = data.user.id;

//   const { data: players, error: playersError } = await supabase
//     .from("user_roster")
//     .select(`
//       player_id,
//       players (
//         id,
//         name,
//         position,
//         age,
//         overall
//       )
//     `)
//     .eq("user_id", userId);

//   if (playersError) throw playersError;
//   return players;
// }
