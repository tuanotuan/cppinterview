#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    values.reserve(4);
    values.push_back(1);
    values.push_back(2);
    values.push_back(3);

    const auto first = values.begin();
    values.push_back(4); // capacity prevents reallocation
    std::cout << "saved first: " << *first << "\n";

    std::cout << "reverse:";
    for (auto it = values.rbegin(); it != values.rend(); ++it) {
        std::cout << ' ' << *it;
    }
    std::cout << "\n";
}
