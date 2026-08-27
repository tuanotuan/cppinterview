#include <iostream>

void print_quote(const double& bid, const double& ask) {
    // const references read the original values without copying or
    // modifying them.
    std::cout << "Bid: " << bid << '\n';
    std::cout << "Ask: " << ask << '\n';
}

void add_volume(int& volume, int added_volume) {
    // A non-const reference can modify the original variable.
    volume += added_volume;
}

int main() {
    const char* const symbol = "AAPL";

    double bid = 189.10;
    double ask = 189.14;
    int bid_volume = 500;

    const double* selected_price = &bid;
    double& price_alias = bid;

    std::cout << "Symbol: " << symbol << '\n';
    print_quote(bid, ask);

    std::cout << "Selected price: " << *selected_price << '\n';

    price_alias = 189.12; // Changes bid because price_alias refers to bid.
    add_volume(bid_volume, 100);

    // A pointer-to-const can be redirected, but it cannot modify the price.
    selected_price = &ask;

    std::cout << "Updated bid: " << bid << '\n';
    std::cout << "Updated bid volume: " << bid_volume << '\n';
    std::cout << "Pointer now selects ask: " << *selected_price << '\n';

    const double& read_only_ask = ask;
    std::cout << "Read-only ask reference: " << read_only_ask << '\n';

    return 0;
}
