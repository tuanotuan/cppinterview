#include <functional>
#include <iostream>
#include <set>
#include <string>

int main() {
    std::set<std::string, std::less<>> names{"lan", "an", "minh"};

    std::cout << "ordered:";
    for (const auto& name : names) std::cout << ' ' << name;
    const auto found = names.find("lan"); // heterogeneous argument
    std::cout << "\nfound: " << (found != names.end()) << "\n";
}
