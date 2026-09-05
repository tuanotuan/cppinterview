// Real-World C++ Interviews Q170: How can RAII (Resource Acquisition Is Initialization) help
// with exception safety?
// Key: RAII stores resource ownership in an object's state: construction establishes ownership
// and the destructor releases it. Because destructors of fully constructed automatic objects
// run during normal return and stack unwinding, files, locks, memory, and other resources are
// released without duplicated cleanup paths. RAII prevents leaks but does not by itself
// guarantee transactional state; strong exception guarantees may also require
// commit-after-success designs such as copy-and-swap.
#include <iostream>
#include <memory>
#include <stdexcept>

struct Resource {
    ~Resource() { std::cout << "released" << std::endl; }
};

void work() {
    const auto resource = std::make_unique<Resource>();
    throw std::runtime_error{"failure"};
}

int main() {
    try {
        work();
    } catch (const std::exception&) {
        std::cout << "caught" << std::endl;
    }
}
