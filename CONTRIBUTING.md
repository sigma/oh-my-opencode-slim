# Contributing to firefly-swarm

Thank you for your interest in contributing to firefly-swarm! We welcome all contributions that help make this agent orchestration plugin more efficient, powerful, and user-friendly.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/firefly-swarm.git
    cd firefly-swarm
    ```
3.  **Install dependencies** using Bun:
    ```bash
    bun install
    ```

## Development Workflow

### Branching Policy

- Create a feature branch for your changes:
  ```bash
  git checkout -b feature/your-feature-name
  # or
  git checkout -b fix/your-bug-fix
  ```

### Code Style

- We use [Prettier](https://prettier.io/) for formatting.
- Ensure your code passes type checking:
  ```bash
  bun run typecheck
  ```

### Testing

- Add tests for new features or bug fixes.
- Run tests before submitting a PR:
  ```bash
  bun test
  ```

## Submitting a Pull Request

1.  **Commit your changes** with a descriptive message.
2.  **Push to your fork**:
    ```bash
    git push origin feature/your-feature-name
    ```
3.  **Open a Pull Request** against the `master` branch of the original repository.
4.  Ensure CI passes and address any feedback from reviewers.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
