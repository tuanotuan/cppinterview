#include <chrono>
#include <iostream>
#include <string>
#include <tuple>
#include <utility>

int main() {
    std::pair<int, std::string> user = std::make_pair(7, "Ada");
    std::tuple<int, double, bool> quote = std::make_tuple(9, 2.5, true);

    int id = 0;
    double price = 0.0;
    bool valid = false;
    std::tie(id, price, valid) = quote;

    std::chrono::milliseconds delay(20);
    const std::string message = std::to_string(delay.count()) + "ms";

    std::cout << user.first << ':' << user.second << '\n';
    std::cout << id << ',' << price << ',' << valid << '\n';
    std::cout << message << '\n';
}
