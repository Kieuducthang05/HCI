import { db, withTx } from "../src/db/client";
import { createAdminContentRow } from "../src/db/queries/admin_content_queries";

async function test() {
  try {
    const adminId = "00000000-0000-4000-8000-000000000001"; // Default admin
    const title = "Nhận biết cảm xúc chia sẻ Test";
    const type = "QUIZ";
    const status = "PUBLISHED";
    const typeData = {
      mediaUrl: null,
      description: "Khi bạn cùng lớp vui vẻ chia sẻ đồ chơi với con, con sẽ cảm thấy thế nào?",
      difficultyLevel: 1,
      isDefault: false,
      answerEmotions: ["HAPPY", "ANGRY", "SAD"],
      correctEmotion: "HAPPY"
    };

    console.log("Attempting insert...");
    const row = await withTx(async (tx) => {
      return await createAdminContentRow(
        tx,
        {
          title,
          type,
          status,
          createdBy: adminId,
        },
        typeData,
      );
    });
    console.log("Success:", row);
  } catch (err) {
    console.error("Caught Error:", err);
  }
}

test();
