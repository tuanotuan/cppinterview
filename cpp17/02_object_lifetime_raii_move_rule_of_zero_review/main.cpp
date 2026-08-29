#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Batch {
    std::string name;
    std::vector<int> values;
}; // Rule of Zero

int main() {
    Batch source{"scores", {10, 20, 30}};
    Batch destination = std::move(source);
    std::cout << "name: " << destination.name << '\n';
    std::cout << "count: " << destination.values.size() << '\n';
    source.values.clear(); // moved-from object is still valid
    std::cout << "source valid: " << source.values.empty() << '\n';
}
