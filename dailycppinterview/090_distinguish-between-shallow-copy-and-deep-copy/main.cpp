// Real-World C++ Interviews Q090: Distinguish between shallow copy and deep copy
// Key: A shallow copy duplicates handles while both objects still refer to the same underlying
// resource; a deep copy creates an independent resource with equivalent value. The correct
// choice follows the type's ownership and value semantics.
#include <iostream>
#include <memory>
#include <vector>

int main() {
    auto shared = std::make_shared<int>(1);
    auto shallow = shared;
    std::vector<int> deep_source{1};
    auto deep = deep_source;
    *shallow = 2;
    deep[0] = 3;
    std::cout << *shared << ' ' << deep_source[0] << '\n';
}
