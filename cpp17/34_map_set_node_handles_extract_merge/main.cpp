#include <iostream>
#include <map>
#include <string>
#include <utility>

int main() {
    std::map<int, std::string> source{{1, "one"}, {2, "two"}};
    std::map<int, std::string> destination{{3, "three"}};

    auto node = source.extract(2);
    node.key() = 20;
    destination.insert(std::move(node));
    destination.merge(source);

    std::cout << "destination:";
    for (const auto& [key, value] : destination) {
        std::cout << ' ' << key << '=' << value;
    }
    std::cout << "\nsource empty: " << source.empty() << '\n';
}
