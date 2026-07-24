#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <span>
#include <stdexcept>
#include <variant>

using OrderId = std::uint64_t;
using Price4 = std::int64_t;

struct AddOrder {
    OrderId order_id;
    Price4 price;
    std::uint32_t quantity;
    bool is_bid;
};

struct TradePrint {
    std::uint64_t match_id;
    Price4 price;
    std::uint32_t quantity;
    bool printable;
};

using MarketEvent = std::variant<AddOrder, TradePrint>;

std::uint64_t read_be(std::span<const std::byte> bytes) {
    if (bytes.empty() || bytes.size() > sizeof(std::uint64_t)) {
        throw std::runtime_error("invalid integer width");
    }

    std::uint64_t value = 0;
    for (std::byte byte : bytes) {
        value = (value << 8) | std::to_integer<unsigned char>(byte);
    }
    return value;
}

AddOrder decode_synthetic_add(std::span<const std::byte> bytes) {
    // Synthetic layout used only for this lesson:
    // [order_id:8][price4:4][quantity:4][side:1]
    constexpr std::size_t expected_size = 17;
    if (bytes.size() != expected_size) {
        throw std::runtime_error("truncated or oversized add message");
    }

    const auto quantity = read_be(bytes.subspan(12, 4));
    const auto side = std::to_integer<unsigned char>(bytes[16]);
    if (quantity == 0 ||
        quantity > std::numeric_limits<std::uint32_t>::max() ||
        (side != 'B' && side != 'S')) {
        throw std::runtime_error("invalid add fields");
    }

    return {
        .order_id = read_be(bytes.first(8)),
        .price = static_cast<Price4>(read_be(bytes.subspan(8, 4))),
        .quantity = static_cast<std::uint32_t>(quantity),
        .is_bid = side == 'B',
    };
}

int main() {
    constexpr std::array packet{
        std::byte{0x00}, std::byte{0x00}, std::byte{0x00}, std::byte{0x00},
        std::byte{0x00}, std::byte{0x00}, std::byte{0x00}, std::byte{0x2A},
        std::byte{0x00}, std::byte{0x12}, std::byte{0xD6}, std::byte{0x44},
        std::byte{0x00}, std::byte{0x00}, std::byte{0x00}, std::byte{0x64},
        std::byte{'B'},
    };

    const AddOrder add = decode_synthetic_add(packet);
    std::cout << "order=" << add.order_id
              << " raw_price4=" << add.price
              << " qty=" << add.quantity
              << " side=" << (add.is_bid ? "bid" : "ask") << '\n';
}
