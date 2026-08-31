#include <functional>
#include <iostream>
#include <memory>
#include <version>

int main() {
#if defined(__cpp_lib_move_only_function)
    auto owned = std::make_unique<int>(7);
    std::move_only_function<int()> task =
        [value = std::move(owned)] { return *value; };

    std::cout << "task=" << task() << '\n';
#else
    std::cout << "move_only_function unavailable\n";
#endif
}
