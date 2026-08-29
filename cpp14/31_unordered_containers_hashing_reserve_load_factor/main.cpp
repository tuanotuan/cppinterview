#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, int> scores;
    scores.max_load_factor(0.75f);
    scores.reserve(8);

    scores.emplace("an", 80);
    scores.emplace("mai", 95);
    scores.emplace("lan", 88);

    std::cout << "size: " << scores.size() << "\n";
    std::cout << "mai: " << scores.at("mai") << "\n";
    std::cout << "within load limit: "
              << (scores.load_factor() <= scores.max_load_factor()) << "\n";
}
