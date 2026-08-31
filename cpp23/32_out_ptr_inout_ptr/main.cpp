#include <iostream>
#include <memory>
#include <version>

#if defined(__cpp_lib_out_ptr)
void create_value(int** output) {
    *output = new int(7);
}

void replace_value(int** output) {
    delete *output;
    *output = new int(9);
}
#endif

int main() {
#if defined(__cpp_lib_out_ptr)
    std::unique_ptr<int> owner;
    create_value(std::out_ptr(owner));
    replace_value(std::inout_ptr(owner));
    std::cout << *owner << '\n';
#else
    std::cout << "out_ptr and inout_ptr unavailable\n";
#endif
}
