#include <iostream>
#include <memory>
#include <string>
#include <utility>

int main() {
    auto owner = std::make_unique<std::string>("owned by closure");
    auto job = [text = std::move(owner)] {
        return *text;
    };

    std::cout << "source owns: " << static_cast<bool>(owner) << "\n";
    std::cout << "job result: " << job() << "\n";
}
