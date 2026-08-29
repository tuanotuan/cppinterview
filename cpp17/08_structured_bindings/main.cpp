#include <iostream>
#include <string>
#include <utility>

int main() {
    // Keep the owner alive for every reference binding below.
    std::pair<std::string, int> result{"Ada", 91};
    auto& [name, score] = result;

    // A reference binding updates the pair rather than a hidden copy.
    score += 4;

    std::cout << name << ": " << score << '\n';
    std::cout << "original score: " << result.second << '\n';
}
