#include <iostream>

int main() {
    // Fixed market data so the output is easy to verify.
    const char* symbol = "AAPL";
    const double bid_price = 189.10;
    const double ask_price = 189.14;
    const int bid_volume = 500;
    const int ask_volume = 400;

    // A simple validity check for one quote snapshot.
    const bool price_order_is_valid = bid_price <= ask_price;
    const double spread = ask_price - bid_price;

    std::cout << "C++11 quote check\n";
    std::cout << "Symbol: " << symbol << '\n';
    std::cout << "Bid: " << bid_price
              << " x " << bid_volume << '\n';
    std::cout << "Ask: " << ask_price
              << " x " << ask_volume << '\n';
    std::cout << "Spread: " << spread << '\n';

    if (!price_order_is_valid) {
        std::cerr << "Error: bid price is greater than ask price.\n";
        return 1; // Non-zero means the program detected an error.
    }

    std::cout << "Quote is valid.\n";
    return 0; // Zero means successful execution.
}