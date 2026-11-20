# Đảo Đèn Lồng — AI SDLC

**Video demo:** chưa có. Sẽ bổ sung video `.mp4` dưới 5 phút và link tại đây khi hoàn tất Phase 4.

Trịnh Thanh Tùng · MSSV **2A202603456** · K5-L3A · Day 12.

Game 3D góc nhìn thứ ba: Mây thu thập đom đóm, thắp đèn và tránh Bóng Mực trên ba
hòn đảo. Phase 3 Ticket-03 / Contract 1.2 đang được triển khai trong working
tree. Phase 1 đã phát hành; Phase 2 có tag lịch sử. Phase 3 local verification
và một lượt browser smoke check đã được ghi trong `docs/evidence/phase-3-final/`;
fuel-bar gameplay review và Ubuntu CI vẫn cần hoàn tất trước tag.

Đã công bố tag **`phase-1`** tại commit `a53d13a`, kèm các giới hạn đã ghi trong bằng chứng.
Kiểm chứng bổ sung sau tag đang tiếp tục; việc có tag không đồng nghĩa mọi mục đã đạt.
Phase 3–4, Release `v1.0.0`, video và giấy phép dự án còn thiếu.

## Cài đặt và chạy — tối đa 3 lệnh

Yêu cầu Node.js **20.19+ hoặc 22.12+**, npm và trình duyệt hỗ trợ WebGL.

```sh
npm ci
npm run build
npm run preview
```

Mở URL local được in ra. Cài sạch, test/build/headless và HTTP preview trên Ubuntu
đã đạt trong [run CI kiểm chứng tag Phase 1](https://github.com/TgTrh06/K5-L3A-DAY12-TrinhThanhTung-2A202603456-AI-SDLC-Dao-Den-Long/actions/runs/44718587705).
Đồ họa được quan sát trên Windows Chrome; CI Ubuntu chưa kiểm tra WebGL bằng mắt.
Khi phát triển: `npm run dev`.

## Điều khiển và luật chơi

| Phím/thao tác | Hành động |
|---|---|
| WASD / mũi tên | Di chuyển theo góc camera |
| Kéo chuột | Xoay camera |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp đom đóm vào đèn ở gần |
| Q | Tỏa sáng, tiêu hao 3 đom đóm |
| Esc / P | Tạm dừng / tiếp tục |
| R | Chơi lại đêm hiện tại |

Thời lượng chuẩn Phase 3 là **240 / 270 / 300 giây**. Đèn đang sáng hao dầu;
Mây phải châm dầu hoặc thắp lại đèn tắt và giữ ít nhất **3/5, 4/6, 5/7** đèn
sáng tới bình minh. Sức chứa bắt đầu ở **10**, tăng 2 sau mỗi lần thắp thành công,
tối đa **20**. Mây có **3 Ngọn Lửa**; đèn còn dầu từ 30 trở lên giữ vùng an toàn
bán kính **6 m**. Cấu hình chính xác theo [spec Phase 3](docs/phases/phase-3-spec.md)
và [ADR-0003](docs/adr/0003-fuel-and-dawn.md). Hành trình đi qua Đảo Bến, Đảo Cau,
rồi Đảo Chuông; tổng điểm cộng điểm các đêm đã thắng.

Điều khiển bằng bàn phím/chuột. Cài đặt âm lượng và độ nhạy được lưu trong trình
duyệt; bố cục hẹp không đồng nghĩa có điều khiển cảm ứng.

## Kiểm thử và headless

```sh
npm test
node src/headless.js --seed 12 --night 1 --ticks 600 --out result.jsonl
```

Contract: [game.contract.json](game.contract.json), phiên bản 1.2.
Tùy chọn: `--scenario file.json --inputs file.json --snapshot-every 10`.
Simulation cố định 60 tick/giây, không cửa sổ/GPU. Snapshot tick 0 trước input;
input tick k tạo event tick k+1. Hành động dùng cạnh false→true.
Tọa độ làm tròn 3 chữ số thập phân, output JSONL tất định cho cùng seed và input.
Scenario/input sai trả mã 2; lỗi CLI/runtime khác trả mã 1.

Kiểm chứng Phase 3 bằng `npm run verify:phase3`. Lệnh chạy toàn bộ test/build,
fixtures headless v1.2 hai lần để so determinism, và ba lượt simulation đủ thời
lượng. Đây là kiểm tra CLI, không phải chơi tay. Xem
[bảng yêu cầu → kiểm tra](docs/phases/phase-3-spec.md) và bằng chứng tại
[`docs/evidence/phase-3-final`](docs/evidence/phase-3-final/). Kết quả local sẽ
được ghi sau khi verifier chạy trên bản cuối.
Phase 1 có bằng chứng độc lập và không bị ghi đè bởi script Phase 2: xem
[`docs/evidence/phase-1-final/README.md`](docs/evidence/phase-1-final/README.md).
Các [log ban đầu](docs/evidence/phase-1/verification-summary.md) và
[review mỹ thuật](docs/evidence/watercolor/verification.md) vẫn được giữ để tra cứu.

QA trình duyệt: `npm run dev`, mở URL kèm `?verify=1`, chọn **Nạp fixture seed 12**
rồi **Chạy replay từ đầu**. Panel hiển thị rõ chế độ kiểm thử và số đo. Replay chỉ
gửi input, không đặt state/teleport. Harness này chỉ bật ở development, không nằm
trong production build; không dùng số đo của nó như benchmark bản phát hành.

Đo quan sát production: mở URL preview kèm `?metrics=1`, bấm **Bắt đầu đo**.
Module chỉ quan sát frame/tài nguyên, không replay hoặc sửa game. Bộ đo hiện warm-up
10 giây rồi lấy mẫu 60 giây; chỉ frame khi trang hiển thị và có focus mới được tính.
Đo tại viewport 1280×720 để đối chiếu yêu cầu Phase 2. Phase 2 production sample
đạt 78,97 FPS trung bình trong 60 giây, p95 20,30 ms, tối đa 240 ms; xem
[browser report Phase 2](docs/evidence/phase-2-final/browser-report.md). Mẫu cũ
trong trình duyệt tích hợp khoảng 0,99 FPS; ba mẫu Chrome riêng sau khôi phục cửa sổ đạt 75,40–83,84 FPS tại
902×934, DPR 1. Hai điều kiện đo khác nhau; xem [báo cáo sau tag](docs/evidence/phase-1-post-tag/README.md).

## Kiểm chứng Ubuntu bằng GitHub Actions

Workflow [Verify Phase 1 on Ubuntu](.github/workflows/verify-phase-1.yml) checkout
chính tag `phase-1` và từ chối chạy nếu tag không còn trỏ vào commit
`a53d13ad186ce31936594ea2a8b25dea2a38c8d5`. Workflow nằm ở commit bổ sung trên
`main`; không thay tag hoặc ghi ngược output CI vào repo.

Sau khi workflow được duyệt và push: vào **Actions → Verify Phase 1 on Ubuntu →
Run workflow → main**. Nó cũng tự chạy khi file workflow được cập nhật trên `main`.
Các bước: cài sạch `npm ci`, chạy test/build/headless bằng script hiện có, mở
preview rồi kiểm tra HTTP của HTML và asset JS/CSS. Token chỉ có `contents: read`.

Run [44718587705](https://github.com/TgTrh06/K5-L3A-DAY12-TrinhThanhTung-2A202603456-AI-SDLC-Dao-Den-Long/actions/runs/44718587705)
đã thành công: Ubuntu 24.04, Node 22.23.4, 83/83 test, build/headless/HTTP đạt.
Mở run, xem **Summary** và tải artifact `phase-1-ubuntu-44718587705-1` (giữ 30 ngày,
hết hạn dự kiến 20/12/2026). CI không kiểm tra đồ họa bằng GPU, FPS hoặc chơi tay.
[Chi tiết kết quả, cách đọc bằng chứng và giới hạn](docs/evidence/phase-1-post-tag/README.md).

Workflow [Verify Phase 2 historical tag](.github/workflows/verify-phase-2.yml)
chỉ chạy thủ công và checkout tag `phase-2`, giữ nguyên xác minh phiên bản đó.
Workflow [Verify Phase 3 on Ubuntu](.github/workflows/verify-phase-3.yml) kiểm tra
branch hiện tại bằng `npm ci`, test/build/fixtures và smoke test HTTP. Chưa có
run Ubuntu Phase 3 nào cho tới khi workflow được push và chạy.

## Sáng tạo của tôi

Hướng mỹ thuật Việt Nam đêm trăng: mây cuộn viền vàng, trăng ngà, nón lá có nan tre,
đèn giấy có gân, màu chàm và texture giấy loang. Geometry/texture được tạo bằng
Three.js và Canvas trong `src/visuals/`, tách khỏi simulation. Không đưa ảnh tham
chiếu vào bản game. Có hỗ trợ giảm chuyển động trang trí theo cài đặt hệ thống.

![Cảnh game](docs/evidence/watercolor/desktop.jpg)

[Ảnh cửa sổ hẹp](docs/evidence/watercolor/narrow.jpg) ·
[Màn thua thực tế](docs/evidence/watercolor/loss.jpg) ·
[CREDITS](CREDITS.md).

## SDLC và hướng dẫn submission

| Tài liệu | Nội dung |
|---|---|
| [SUBMISSION.md](SUBMISSION.md) | Tên repo, deadline, tags, Release, video và checklist |
| [RULES.md](RULES.md) | Trung thực, bản quyền, harness và bảo mật |
| [RUBRIC.md](RUBRIC.md) | Tiêu chí chấm điểm |
| [GUIDE.md](GUIDE.md) | Quy trình SDLC |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Mốc nghiệm thu |
| [README-LAB.md](README-LAB.md) | README lab gốc được giữ nguyên nội dung |
| [AGENTS.md](AGENTS.md) | Harness agent đã sử dụng |
| [AI usage](docs/ai-usage.md) / [Retro](docs/retro.md) | Token ước tính, lỗi AI và bài học |

## Các mục còn thiếu trước khi nộp cuối cùng

- Chơi campaign bằng người từ đêm 1 tới chiến thắng đêm 3, nghe âm thanh sự kiện
  và lưu video/ảnh demo. Browser smoke check Phase 3 chỉ kiểm tra menu, HUD đêm 1
  và persistence của cài đặt; thanh dầu, cảnh báo dầu yếu và thắng campaign chưa
  được nhìn thấy trong lượt này. Âm thanh vẫn chưa được xác nhận bằng nghe.
- Push và chạy workflow Ubuntu cho Phase 3; workflow hiện ở working tree. WebGL
  trên Linux/macOS chưa được kiểm tra bằng mắt. Workflow lịch sử Phase 2 cũng
  chưa có run evidence mới.
- Hoàn thiện và nghiệm thu từng phase; tags `phase-1` … `phase-4` đúng commit.
- Release `v1.0.0` có bản chạy được; video `.mp4` dưới 5 phút, link ở đầu README.
- Chọn và bổ sung `LICENSE`; CREDITS hiện có nhưng chưa thay thế giấy phép dự án.
- Xác nhận repo/Release/video public và hạn nộp thực tế theo Coach.

Không khai hoàn thành thay cho các mục chưa đạt; không commit `.env`, API key,
token, `node_modules`, `dist` hoặc output headless local `result.jsonl`.
