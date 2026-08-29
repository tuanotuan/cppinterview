#include <iostream>
#include <memory>

struct Item {
    explicit Item(int value) : value(value) {}
    int value;
};

int main() {
    auto item = std::make_unique<Item>(42);
    std::cout << "item value: " << item->value << "\n";
} // item is destroyed automatically
