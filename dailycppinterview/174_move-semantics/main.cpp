// Real-World C++ Interviews Q174: What are move semantics in C++11, and why are they important?
// Key: Move semantics let an object transfer resources from an expiring source instead of
// duplicating them, using rvalue references plus move construction or move assignment.
// `std::move` performs only a cast that makes an object eligible for moving; the selected
// operation does the transfer. A moved-from standard-library object remains valid but usually
// has an unspecified value, and marking genuine move operations `noexcept` lets containers
// prefer them while preserving strong guarantees during reallocation.
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Message {
    std::string text;
    std::vector<int> payload;
};

int main() {
    Message source{"ready", {1, 2, 3}};
    Message target = std::move(source);
    std::cout << target.text << ' ' << target.payload.size() << std::endl;
}
