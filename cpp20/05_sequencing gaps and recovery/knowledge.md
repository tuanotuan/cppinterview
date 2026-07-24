# Trading Systems - Sequencing, Packet Gaps and Recovery

## 1. Goal

Sau bài này, bạn cần:

1. phân biệt transport packet sequence với sequence ở application/instrument;
2. xử lý redundant feeds mà không apply duplicate hai lần;
3. phát hiện gap và dừng publish state không còn đáng tin;
4. merge live traffic với retransmission hoặc snapshot recovery;
5. thiết kế buffer, timeout và failure policy có giới hạn.

## 2. Transport Sequence and Application Sequence

Một hệ thống có thể có nhiều lớp sequence:

- packet sequence của transport/channel;
- message sequence bên trong packet;
- per-instrument report sequence;
- business identifier như order ID hoặc match ID.

Không trộn chúng.

Nasdaq MoldUDP64 packet header mang sequence number của message đầu tiên và
message count. Các message tiếp theo trong packet được đánh số liên tiếp. Khi
receiver phát hiện gap, protocol cho phép request retransmission từ sequence đầu
và số message cần lấy lại.

CME MDP dùng packet sequence: mỗi packet tăng một, dù packet có thể chứa một
hoặc nhiều message/event. Một gap ở packet sequence có thể ảnh hưởng nhiều
instrument; một discontinuity theo instrument có phạm vi khác.

Vì vậy không viết một phép tăng universal:

```text
MoldUDP64: expected_message = first_message_sequence + message_count
CME MDP:   expected_packet  = packet_sequence + 1
```

Parser transport phải đưa đúng unit vào sequencer; nếu gọi cả hai là `sequence`
mà không lưu `SequenceKind`, code rất dễ phát hiện gap sai.

Key state nên có scope:

```text
(venue, channel, session) -> expected transport sequence
(venue, channel, session, instrument) -> expected report sequence
```

Reset session phải reset đúng state. Không coi sequence nhỏ hơn expected là
duplicate nếu session đã đổi.

## 3. Redundant Feed Arbitration

Nhiều venue phát cùng logical data qua feed A/B. CME công khai rằng cùng packet
được gửi qua cả UDP Feed A và Feed B, và client nên dùng chúng để arbitration.

Mục tiêu không phải "apply cả hai cho chắc". Mục tiêu là phát đúng một ordered
logical stream:

```text
A: 100, 101,     103
B: 100, 101, 102, 103
output: 100, 101, 102, 103
```

Arbitrator có thể nhận packet đầu tiên cho expected sequence rồi discard packet
cùng sequence đã process khi bản còn lại tới. Nếu A thiếu 102 nhưng B có, không
cần recovery.

Những điểm phải định nghĩa:

- arbitration identity tối thiểu là channel/session/packet sequence;
- CME không hứa raw bytes từ A/B giống hệt nhau; transport metadata như sending
  time có thể khác. Nếu kiểm divergence, so normalized business messages sau khi
  bỏ metadata theo feed contract;
- cùng logical identity nhưng normalized business content khác là severe
  integrity error;
- packet đến quá xa ahead được buffer bao nhiêu;
- timeout trước khi re-request;
- feed health metrics riêng A/B;
- failover không làm reset logical expected sequence.

## 4. Live Gap Handling

Với expected sequence `N`:

- `seq < N`: duplicate/late packet; không apply lại;
- `seq == N`: apply và tăng expected;
- `seq > N`: có gap `[N, seq)`.

Phép "tăng expected" ở đây dùng đơn vị của sequencer. Với CME packet sequence là
`N + 1`; với MoldUDP64 phải advance theo message count như phần trên.

Khi gap:

1. giữ packet ahead trong bounded buffer;
2. mặc định đánh dấu **toàn channel** chưa synchronized, vì packet đã mất có thể
   chứa instrument nào vẫn chưa biết; chỉ thu hẹp scope nếu venue/per-instrument
   sequence hoặc recovery evidence chứng minh được;
3. không publish derived state mới của phạm vi đã mất continuity;
4. yêu cầu retransmission hoặc chờ redundant feed;
5. khi missing range tới, apply đúng thứ tự rồi drain contiguous buffer;
6. chỉ chuyển lại healthy sau invariant/checksum policy.

Buffer phải có:

- giới hạn số packet/bytes;
- sequence window tối đa;
- deadline;
- metric high-water mark;
- policy khi overflow: bỏ staging state và chuyển sang snapshot recovery, không
  bỏ packet ngẫu nhiên rồi tiếp tục.

Timestamp không chữa được gap. Sort theo timestamp có thể đổi protocol order và
không tạo lại event đã mất.

## 5. Small Replay versus Full Recovery

Chọn recovery theo độ lớn và khả năng protocol:

### Small gap

- lấy packet từ redundant feed hoặc retransmission/TCP replay;
- merge với live buffer;
- apply một lần theo sequence;
- giữ state hiện tại nếu chưa có consumer đọc state sau gap.

CME nói TCP historical replay phù hợp small-scale recovery và request theo range
packet sequence. Nasdaq MoldUDP64 có re-request server trả downstream packet.

### Large gap hoặc không còn replay

- dựng state mới từ market recovery snapshot;
- tiếp tục queue live incremental;
- nối snapshot với live bằng cutover metadata;
- atomic swap generation mới;
- bỏ state cũ sau khi không còn reader.

Market-recovery snapshot chỉ khôi phục loại state mà snapshot cung cấp. Ví dụ CME
MBP/MBOFD recovery phục hồi book, nhưng không tự tái tạo missed statistics.
Trade/interval statistics phải lấy từ replay/nguồn phù hợp hoặc mang data-quality
gap riêng; không được đánh dấu toàn pipeline healthy chỉ vì book đã nối lại.

Quyết định không nên chỉ dựa trên số packet. Một packet có thể chứa event của
nhiều instrument, và replay window/latency budget cũng quan trọng.

## 6. Snapshot Incremental Cutover

Một recovery generation an toàn:

```text
live incremental -> bounded queue
market recovery snapshot -> staging book
cutover metadata -> discard old queued updates
remaining continuous updates -> staging book
validate -> atomic publish staging generation
```

CME MBP/MBOFD recovery là ví dụ cụ thể:

- khi cả hai incremental feeds mất packet, gap xuất hiện ở packet sequence;
- client queue realtime incremental của affected channel;
- snapshot `LastMsgSeqNumProcessed` liên hệ snapshot với incremental packet
  sequence;
- cached updates cũ hơn cutover bị bỏ;
- khi cùng instrument xuất hiện quanh cutover, `TransactTime` còn được đối chiếu;
- mismatch yêu cầu recovery iteration tiếp theo.

Không áp dụng field/tag CME vào feed khác, nhưng hãy học nguyên tắc:

1. snapshot phải nói nó chứa state đến đâu;
2. live queue phải nối liên tục từ mốc đó;
3. stale snapshot không được publish;
4. cutover phải atomic với consumer.

## 7. Idempotency and Deterministic Replay

Recovery tốt cần replay cùng input cho cùng output:

- mỗi packet/event có identity;
- duplicate không mutate state;
- applied sequence chỉ tăng sau successful state transition;
- raw capture immutable;
- normalized schema/version được lưu;
- snapshot output có state checksum;
- metrics/log không ảnh hưởng behavior.

Với event update không tự idempotent, sequence gate là bắt buộc. Apply hai lần
partial cancel sẽ làm quantity sai dù event bytes giống nhau.

Test A/B arbitration nên randomize arrival order nhưng expected logical output
không đổi.

## 8. Monitoring and Incident Evidence

Metrics:

- last received/applied sequence;
- gaps detected, recovered và unrecoverable;
- duplicate packets theo feed;
- A/B divergence;
- retransmission latency/range;
- recovery buffer bytes/high-water;
- synchronized instruments/channel;
- snapshot age và cutover lag;
- state checksum mismatch với hệ thống cũ.

Khi incident:

1. khoanh vùng channel/session/sequence range;
2. giữ raw packet capture và build/schema version;
3. dừng publish corrupted scope;
4. thử deterministic replay;
5. so sánh state hash trước/sau gap;
6. chỉ resume khi continuity và invariants được chứng minh.

## 9. Primary References

- [Nasdaq MoldUDP64 Protocol Specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/moldudp64.pdf)
  — packet sequence, heartbeat và re-request.
- [CME MDP 3.0 Dissemination](https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457222936/MDP+3.0+-+Dissemination)
  — Feed A/B arbitration, recovery feeds và historical replay.
- [CME MDP Packet Structure](https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457326496/MDP-30---Packet-Structure-with-Event-Based-Messaging)
  — packet sequencing và packet có một hoặc nhiều message.
- [CME Incremental Feed Arbitration](https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457672396/MDP+3.0+-+Incremental+Feed+Arbitration)
  — process A/B theo packet sequence và discard sequence đã process.
- [CME MBP and MBOFD Market Recovery](https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457672425/MDP+3.0+-+MBP+and+MBOFD+Market+Recovery)
  — queue live data, snapshot cutover và stale-snapshot checks.
- [FIX Recommended Practices for Book Management](https://www.fixtrading.org/wp-content/uploads/download-manager-files/MDOWG_Book_Mgt-v20.pdf)
  — snapshot/incremental recovery patterns.

## 10. End-of-Day Checklist

1. Phân biệt transport sequence và per-instrument sequence.
2. Arbitration Feed A/B chỉ phát một logical packet.
3. Xử lý duplicate, expected và ahead packet.
4. Buffer gap có byte/window/deadline limit.
5. Chọn small replay hoặc full snapshot recovery.
6. Giải thích snapshot/incremental cutover.
7. Đảm bảo replay deterministic và state publication fail closed.
