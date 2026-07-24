#include <cstdint>
#include <functional>
#include <iostream>
#include <limits>
#include <map>
#include <stdexcept>
#include <unordered_map>

using OrderId = std::uint64_t;
using Price4 = std::int64_t;
using Quantity = std::uint64_t;

enum class Side { bid, ask };

struct Order {
    Side side;
    Price4 price;
    Quantity remaining;
};

// This lesson-sized type derives aggregate levels from order events.
// A full MBO implementation also needs a venue-defined priority index per level.
class AggregateBookFromOrders {
public:
    void add(OrderId id, Side side, Price4 price, Quantity quantity) {
        if (quantity == 0 || orders_.contains(id)) {
            throw std::runtime_error("invalid add");
        }

        const auto [it, inserted] =
            orders_.emplace(id, Order{side, price, quantity});
        try {
            add_to_level(side, price, quantity);
        } catch (...) {
            orders_.erase(it);
            throw;
        }
    }

    void reduce(OrderId id, Quantity quantity) {
        const auto it = orders_.find(id);
        if (it == orders_.end() || quantity == 0 || quantity > it->second.remaining) {
            throw std::runtime_error("invalid reduce");
        }

        const Order before = it->second;
        remove_from_level(before.side, before.price, quantity);
        it->second.remaining -= quantity;
        if (it->second.remaining == 0) {
            orders_.erase(it);
        }
    }

    void erase(OrderId id) {
        const auto it = orders_.find(id);
        if (it == orders_.end()) {
            throw std::runtime_error("invalid delete");
        }
        const Order before = it->second;
        remove_from_level(before.side, before.price, before.remaining);
        orders_.erase(it);
    }

    void replace(OrderId old_id, OrderId new_id, Price4 price, Quantity quantity) {
        const auto old = orders_.find(old_id);
        if (old == orders_.end() || orders_.contains(new_id) || quantity == 0) {
            throw std::runtime_error("invalid replace");
        }

        const Side side = old->second.side;
        add(new_id, side, price, quantity);
        erase(old_id);
    }

    void print_top() const {
        if (!bids_.empty()) {
            std::cout << "bid " << bids_.begin()->first << " x " << bids_.begin()->second;
        } else {
            std::cout << "bid empty";
        }
        std::cout << " | ";
        if (!asks_.empty()) {
            std::cout << "ask " << asks_.begin()->first << " x " << asks_.begin()->second;
        } else {
            std::cout << "ask empty";
        }
        std::cout << '\n';
    }

private:
    template <class Levels>
    static void add(Levels& levels, Price4 price, Quantity quantity) {
        const auto [it, inserted] = levels.try_emplace(price, quantity);
        if (!inserted) {
            if (it->second > std::numeric_limits<Quantity>::max() - quantity) {
                throw std::overflow_error("level quantity overflow");
            }
            it->second += quantity;
        }
    }

    template <class Levels>
    static void remove(Levels& levels, Price4 price, Quantity quantity) {
        const auto it = levels.find(price);
        if (it == levels.end() || quantity > it->second) {
            throw std::runtime_error("level underflow");
        }
        it->second -= quantity;
        if (it->second == 0) {
            levels.erase(it);
        }
    }

    void add_to_level(Side side, Price4 price, Quantity quantity) {
        if (side == Side::bid) {
            add(bids_, price, quantity);
        } else {
            add(asks_, price, quantity);
        }
    }

    void remove_from_level(Side side, Price4 price, Quantity quantity) {
        if (side == Side::bid) {
            remove(bids_, price, quantity);
        } else {
            remove(asks_, price, quantity);
        }
    }

    std::unordered_map<OrderId, Order> orders_;
    std::map<Price4, Quantity, std::greater<>> bids_;
    std::map<Price4, Quantity> asks_;
};

int main() {
    AggregateBookFromOrders book;
    book.add(1, Side::bid, 1'000'000, 80);
    book.add(2, Side::bid, 1'000'000, 20);
    book.add(3, Side::ask, 1'000'500, 40);
    book.print_top();

    book.reduce(1, 30);
    book.erase(2);
    book.replace(1, 4, 1'000'100, 25);
    book.print_top();
}
