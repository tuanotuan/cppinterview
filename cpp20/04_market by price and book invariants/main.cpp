#include <cstdint>
#include <iostream>
#include <map>
#include <optional>

using Price4 = std::int64_t;
using Quantity = std::uint64_t;

enum class Side { bid, ask };

struct InstrumentMetadata {
    bool inverted_book;
};

class PriceBook {
public:
    explicit PriceBook(InstrumentMetadata instrument)
        : instrument_(instrument) {}

    // Synthetic absolute-quantity contract:
    // quantity == 0 removes the level; otherwise it replaces level quantity.
    void set_level(Side side, Price4 price, Quantity quantity) {
        auto update = [price, quantity](auto& levels) {
            if (quantity == 0) {
                levels.erase(price);
            } else {
                levels[price] = quantity;
            }
        };

        if (side == Side::bid) {
            update(bids_);
        } else {
            update(asks_);
        }
    }

    std::optional<Price4> best_bid() const {
        if (bids_.empty()) {
            return std::nullopt;
        }
        return instrument_.inverted_book
            ? std::optional<Price4>{bids_.begin()->first}
            : std::optional<Price4>{bids_.rbegin()->first};
    }

    std::optional<Price4> best_ask() const {
        if (asks_.empty()) {
            return std::nullopt;
        }
        return instrument_.inverted_book
            ? std::optional<Price4>{asks_.rbegin()->first}
            : std::optional<Price4>{asks_.begin()->first};
    }

    bool plausible() const {
        if (bids_.empty() || asks_.empty()) {
            return true;
        }
        return instrument_.inverted_book
            ? *best_bid() >= *best_ask()
            : *best_bid() <= *best_ask();
    }

private:
    InstrumentMetadata instrument_;
    // Store levels ascending; instrument metadata decides which end is "best".
    std::map<Price4, Quantity> bids_;
    std::map<Price4, Quantity> asks_;
};

int main() {
    PriceBook normal{{.inverted_book = false}};
    normal.set_level(Side::bid, 1'000'000, 25);
    normal.set_level(Side::ask, 1'000'100, 30);
    std::cout << "normal best=" << *normal.best_bid() << '/'
              << *normal.best_ask()
              << " plausible=" << normal.plausible() << '\n';

    PriceBook inverted{{.inverted_book = true}};
    inverted.set_level(Side::bid, 19'100, 15);
    inverted.set_level(Side::bid, 19'110, 30);
    inverted.set_level(Side::ask, 19'060, 20);
    inverted.set_level(Side::ask, 19'050, 10);
    std::cout << "inverted best=" << *inverted.best_bid() << '/'
              << *inverted.best_ask()
              << " plausible=" << inverted.plausible() << '\n';
}
