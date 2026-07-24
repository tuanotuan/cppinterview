#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <map>
#include <stdexcept>
#include <string>
#include <utility>

using Sequence = std::uint64_t;

class Sequencer {
public:
    explicit Sequencer(Sequence first_expected,
                       std::size_t max_buffered,
                       Sequence max_sequence_ahead,
                       std::size_t fingerprint_history)
        : expected_(first_expected),
          max_buffered_(max_buffered),
          max_sequence_ahead_(max_sequence_ahead),
          fingerprint_history_(fingerprint_history) {}

    void accept(Sequence sequence, std::string payload) {
        if (sequence < expected_) {
            const auto applied = applied_payloads_.find(sequence);
            if (applied != applied_payloads_.end() && applied->second != payload) {
                throw std::runtime_error(
                    "already-applied sequence has different logical payload");
            }
            std::cout << (applied == applied_payloads_.end()
                              ? "late duplicate outside fingerprint history "
                              : "duplicate ")
                      << sequence << '\n';
            return;
        }
        if (sequence == expected_) {
            apply(sequence, payload);
            drain();
            return;
        }

        const auto existing = buffered_.find(sequence);
        if (existing != buffered_.end()) {
            if (existing->second != payload) {
                throw std::runtime_error("same sequence with different payload");
            }
            std::cout << "duplicate buffered " << sequence << '\n';
            return;
        }
        if (sequence - expected_ > max_sequence_ahead_) {
            throw std::runtime_error("sequence is beyond the recovery window");
        }
        if (buffered_.size() == max_buffered_) {
            throw std::runtime_error("gap buffer exhausted; snapshot required");
        }
        buffered_.emplace(sequence, std::move(payload));
        std::cout << "gap: expected " << expected_ << ", received " << sequence
                  << '\n';
    }

private:
    void apply(Sequence sequence, const std::string& payload) {
        if (expected_ == std::numeric_limits<Sequence>::max()) {
            throw std::runtime_error("sequence exhausted; rotate/reset the session");
        }
        std::cout << "apply " << sequence << ": " << payload << '\n';
        applied_payloads_.emplace(sequence, payload);
        while (applied_payloads_.size() > fingerprint_history_) {
            applied_payloads_.erase(applied_payloads_.begin());
        }
        ++expected_;
    }

    void drain() {
        while (true) {
            const auto it = buffered_.find(expected_);
            if (it == buffered_.end()) {
                return;
            }
            const Sequence sequence = it->first;
            apply(sequence, it->second);
            buffered_.erase(it);
        }
    }

    Sequence expected_;
    std::size_t max_buffered_;
    Sequence max_sequence_ahead_;
    std::size_t fingerprint_history_;
    std::map<Sequence, std::string> buffered_;
    std::map<Sequence, std::string> applied_payloads_;
};

int main() {
    Sequencer sequencer{
        100,
        8,  // maximum buffered packets
        64, // maximum sequence distance before snapshot recovery
        16, // recent logical payload fingerprints for A/B verification
    };

    sequencer.accept(100, "add order 42");
    sequencer.accept(101, "add order 43");
    sequencer.accept(103, "cancel order 42");
    sequencer.accept(100, "add order 42"); // same logical packet from feed B
    sequencer.accept(102, "execute order 43"); // closes the gap, then drains 103
}
