# Đảo Đèn Lồng — AI SDLC

**Video demo:** chưa có. Sẽ bổ sung video `.mp4` dưới 5 phút và link tại đây khi hoàn tất Phase 4.

Trịnh Thanh Tùng · MSSV **2A202603456** · K5-L3A · Day 12.

Game 3D góc nhìn thứ ba: Mây thu thập đom đóm để thắp năm Đèn Lồng Lớn trên Đảo Bến,
tránh Bóng Mực và mang ánh sáng trở về trước bình minh.

Đã công bố tag **`phase-1`** tại commit `a53d13a`, kèm các giới hạn đã ghi trong bằng chứng.
Kiểm chứng bổ sung sau tag đang tiếp tục; việc có tag không đồng nghĩa mọi mục đã đạt.
Phase 2–4, Release `v1.0.0`, video và giấy phép dự án còn thiếu.

## Cài đặt và chạy — tối đa 3 lệnh

Yêu cầu Node.js **20.19+ hoặc 22.12+**, npm và trình duyệt hỗ trợ WebGL.

```sh
npm ci
npm run build
npm run preview
```

Mở URL local được in ra. Các lệnh dùng được theo thiết kế trên macOS/Linux;
bằng chứng đã thu hiện là Windows, chưa xác nhận clean-run trên macOS/Linux.
Khi phát triển: `npm run dev`.

## Điều khiển và luật chơi

| Phím/thao tác | Hành động |
|---|---|
| WASD / mũi tên | Di chuyển theo góc camera |
| Kéo chuột | Xoay camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn ở gần |
| Q | Tỏa sáng, tiêu hao 1 lửa |
| Esc / nút Tiếp tục | Tạm dừng / tiếp tục |
| R / nút chơi lại | Bắt đầu lại |

Thắp đủ **5 đèn**, mỗi đèn **10 đom đóm**, trong **300 giây**. Mang tối đa 20 đom đóm.
Mây có 5 lửa; va chạm Bóng Mực làm mất lửa. Pulse dùng lửa cuối cùng cũng gây thua.
Đèn sáng bảo vệ vùng bán kính 5m. Không có hình phạt rơi; nhân vật bị chặn ở rìa đảo.
Yêu cầu bàn phím/chuột; bố cục hẹp không đồng nghĩa có điều khiển cảm ứng.

Điểm: 10/đom đóm nhặt, 100/đèn thắp, 20/Bóng Mực bị pulse làm choáng.
Khi thắng cộng `floor(số giây còn lại)` và 50/lửa còn lại.
Scenario khởi tạo không cộng điểm. Các giả định còn lại ở [spec Phase 1](docs/phases/phase-1-spec.md).

## Kiểm thử và headless

```sh
npm test
node src/headless.js --seed 12 --night 1 --ticks 600 --out result.jsonl
```

Contract: [game.contract.json](game.contract.json), phiên bản 1.0.
Tùy chọn: `--scenario file.json --inputs file.json --snapshot-every 10`.
Simulation cố định 60 tick/giây, không cửa sổ/GPU. Snapshot tick 0 trước input;
input tick k tạo event tick k+1. Hành động dùng cạnh false→true.
Tọa độ làm tròn 3 chữ số thập phân, output JSONL tất định cho cùng seed và input.
Scenario/input sai trả mã 2; lỗi CLI/runtime khác trả mã 1.

Kiểm chứng hiện tại bằng một lệnh: `node scripts/verify-phase1.js`.
Lệnh chạy test/build, sinh một lượt thắng từ game mặc định bằng input hợp lệ,
phát lại qua CLI hai lần và so output. Đây là test simulation, không phải chơi tay.
Xem [bảng yêu cầu → bằng chứng và kết luận](docs/evidence/phase-1-final/README.md).
Các [log ban đầu](docs/evidence/phase-1/verification-summary.md) và
[review mỹ thuật](docs/evidence/watercolor/verification.md) vẫn được giữ để tra cứu.

QA trình duyệt: `npm run dev`, mở URL kèm `?verify=1`, chọn **Nạp fixture seed 12**
rồi **Chạy replay từ đầu**. Panel hiển thị rõ chế độ kiểm thử và số đo. Replay chỉ
gửi input, không đặt state/teleport. Harness này chỉ bật ở development, không nằm
trong production build; không dùng số đo của nó như benchmark bản phát hành.

Đo quan sát production: mở URL preview kèm `?metrics=1`, bấm **Bắt đầu đo**.
Module chỉ quan sát frame/tài nguyên, không replay hoặc sửa game. Mẫu ngắn 5 giây
không thay thế kiểm tra ổn định dài hạn. Mẫu cũ trong trình duyệt tích hợp khoảng
0,99 FPS; ba mẫu Chrome riêng sau khôi phục cửa sổ đạt 75,40–83,84 FPS tại
902×934, DPR 1. Hai điều kiện đo khác nhau; xem [báo cáo sau tag](docs/evidence/phase-1-post-tag/README.md).

## Kiểm chứng Ubuntu bằng GitHub Actions

Workflow [Verify Phase 1 on Ubuntu](.github/workflows/verify-phase-1.yml) được chuẩn
bị để checkout chính tag `phase-1` và từ chối chạy nếu tag không còn trỏ vào commit
`a53d13ad186ce31936594ea2a8b25dea2a38c8d5`. Workflow nằm ở commit bổ sung trên
`main`; không thay tag hoặc ghi ngược output CI vào repo.

Sau khi workflow được duyệt và push: vào **Actions → Verify Phase 1 on Ubuntu →
Run workflow → main**. Nó cũng tự chạy khi file workflow được cập nhật trên `main`.
Các bước: cài sạch `npm ci`, chạy test/build/headless bằng script hiện có, mở
preview rồi kiểm tra HTTP của HTML và asset JS/CSS. Token chỉ có `contents: read`.

Mở run, xem **Summary** và tải artifact `phase-1-ubuntu-<run_id>-<attempt>` (giữ 30
ngày). Chỉ xác nhận Linux đạt sau khi run thực tế thành công; workflow chuẩn bị ở
local chưa phải bằng chứng Linux. CI không kiểm tra đồ họa bằng GPU, FPS hoặc chơi
tay. [Chi tiết cách đọc kết quả và giới hạn](docs/evidence/phase-1-post-tag/README.md).

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

- Kiểm chứng thắng trọn lượt trên UI, hiệu năng và clean-run trên macOS/Linux.
- Hoàn thiện và nghiệm thu từng phase; tags `phase-1` … `phase-4` đúng commit.
- Release `v1.0.0` có bản chạy được; video `.mp4` dưới 5 phút, link ở đầu README.
- Chọn và bổ sung `LICENSE`; CREDITS hiện có nhưng chưa thay thế giấy phép dự án.
- Xác nhận repo/Release/video public và hạn nộp thực tế theo Coach.

Không khai hoàn thành thay cho các mục chưa đạt; không commit `.env`, API key,
token, `node_modules`, `dist` hoặc output headless local `result.jsonl`.
