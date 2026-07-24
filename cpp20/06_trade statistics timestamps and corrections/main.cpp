#include <cstdint>
#include <iostream>
#include <limits>
#include <map>
#include <stdexcept>
#include <unordered_map>
#include <utility>

using MatchId = std::uint64_t;
using Sequence = std::uint64_t;
using Price4 = std::int64_t;
using Quantity = std::uint64_t;

struct Trade {
    Sequence sequence;
    Price4 price;
    Quantity quantity;

    bool operator==(const Trade&) const = default;
};

class CorrectableBar {
public:
    // MatchId is deliberately simplified for one instrument/session.
    // Production identity must also include the venue-specific scope/namespace.
    void add(MatchId id, Trade trade, bool printable) {
        if (!printable) {
            return;
        }
        if (trade.quantity == 0 || trade.price <= 0) {
            throw std::runtime_error("this example requires positive price and quantity");
        }
        if (const auto existing = trades_.find(id); existing != trades_.end()) {
            if (existing->second == trade) {
                return; // idempotent replay
            }
            throw std::runtime_error("same match ID with different payload");
        }
        if (order_.contains(trade.sequence)) {
            throw std::runtime_error("duplicate trade sequence");
        }
        constexpr auto max_turnover = std::numeric_limits<std::int64_t>::max();
        if (trade.quantity >
            static_cast<Quantity>(max_turnover / trade.price)) {
            throw std::overflow_error("turnover multiplication overflow");
        }

        const auto turnover = trade.price * static_cast<std::int64_t>(trade.quantity);
        if (turnover_ > max_turnover - turnover) {
            throw std::overflow_error("turnover sum overflow");
        }
        if (volume_ > std::numeric_limits<Quantity>::max() - trade.quantity) {
            throw std::overflow_error("volume overflow");
        }

        // Copy-on-write keeps the example transactional if a container allocation
        // throws. A production hot path would use staged nodes/rollback guards.
        CorrectableBar staged = *this;
        staged.add_validated(id, trade, turnover);
        swap(staged);
    }

    void break_trade(MatchId id) {
        if (!trades_.contains(id)) {
            throw std::runtime_error("unknown trade break");
        }
        CorrectableBar staged = *this;
        staged.break_validated(id);
        swap(staged);
    }

    void print() const {
        if (trades_.empty()) {
            std::cout << "empty revision=" << revision_ << '\n';
            return;
        }
        const Price4 open = trades_.at(order_.begin()->second).price;
        const Price4 close = trades_.at(order_.rbegin()->second).price;
        std::cout << "O=" << open
                  << " H=" << prices_.rbegin()->first
                  << " L=" << prices_.begin()->first
                  << " C=" << close
                  << " V=" << volume_
                  << " VWAP_truncated="
                  << (turnover_ / static_cast<std::int64_t>(volume_))
                  << " revision=" << revision_ << '\n';
    }

private:
    void add_validated(MatchId id, Trade trade, std::int64_t turnover) {
        trades_.emplace(id, trade);
        order_.emplace(trade.sequence, id);
        prices_[trade.price] += 1;
        volume_ += trade.quantity;
        turnover_ += turnover;
        ++revision_;
    }

    void break_validated(MatchId id) {
        const auto it = trades_.find(id);
        const Trade trade = it->second;
        const auto ordered = order_.find(trade.sequence);
        const auto price_count = prices_.find(trade.price);
        const auto trade_turnover =
            trade.price * static_cast<std::int64_t>(trade.quantity);
        if (ordered == order_.end() || ordered->second != id ||
            price_count == prices_.end() || price_count->second == 0 ||
            volume_ < trade.quantity || turnover_ < trade_turnover) {
            throw std::logic_error("bar indexes are inconsistent");
        }

        volume_ -= trade.quantity;
        turnover_ -= trade_turnover;
        order_.erase(ordered);
        if (--price_count->second == 0) {
            prices_.erase(price_count);
        }
        trades_.erase(it);
        ++revision_;
    }

    void swap(CorrectableBar& other) noexcept {
        using std::swap;
        trades_.swap(other.trades_);
        order_.swap(other.order_);
        prices_.swap(other.prices_);
        swap(volume_, other.volume_);
        swap(turnover_, other.turnover_);
        swap(revision_, other.revision_);
    }

    std::unordered_map<MatchId, Trade> trades_;
    std::map<Sequence, MatchId> order_;
    std::map<Price4, std::size_t> prices_;
    Quantity volume_{};
    std::int64_t turnover_{};
    std::uint64_t revision_{};
};

int main() {
    CorrectableBar bar;
    bar.add(10, {.sequence = 100, .price = 1'000'000, .quantity = 5}, true);
    bar.add(11, {.sequence = 101, .price = 1'000'200, .quantity = 3}, true);
    bar.add(12, {.sequence = 102, .price = 1'000'100, .quantity = 7}, false);
    bar.print();

    bar.break_trade(11);
    bar.print();
}
