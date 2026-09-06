// View state only: no scores, ranking, admission or live freshness inference.
export function publicationStatus(manifest, loaded) {
  if (!loaded || !Array.isArray(manifest?.stocks)) {
    return {
      kind: "unavailable", count: null, candidates: [],
      title: "ยังอ่านข้อมูล candidate ไม่ได้",
      note: "โหลดข้อมูลที่เผยแพร่ไม่สำเร็จ ลองรีเฟรชอีกครั้ง · สถานะนี้ไม่ใช่ผลว่าตลาดไม่มีโอกาส",
    };
  }
  const candidates = manifest.stocks.filter((item) => item && item.kind !== "test_fixture" && String(item.ticker || "").trim());
  const partial = Number(manifest.counts?.failed || 0) > 0 || (Array.isArray(manifest.failures) && manifest.failures.length > 0);
  return {
    kind: partial ? "partial" : candidates.length ? "published" : "empty",
    count: candidates.length,
    candidates,
    title: partial ? "ข้อมูลเผยแพร่ยังไม่ครบ" : candidates.length ? "Candidates จากข้อมูลที่เผยแพร่" : "ยังไม่มี candidate ที่เผยแพร่",
    note: partial
      ? "บางรายการส่งออกไม่สำเร็จ จำนวนที่แสดงจึงยังไม่ครบ · ดูข้อมูลที่เผยแพร่ได้ก่อน"
      : candidates.length
        ? "เรียงตามลำดับที่ backend เผยแพร่ · แยกข้อมูลตัวอย่างออกแล้ว"
        : "ข้อมูลที่เผยแพร่ล่าสุดยังไม่มี candidate · ไม่ใช่ผลการสแกนตลาดสด",
  };
}
